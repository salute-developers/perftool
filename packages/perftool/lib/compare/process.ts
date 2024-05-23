import assert from '../utils/assert';
import { ReportWithMeta } from '../reporter';
import { JSONSerializable } from '../utils/types';
import { Comparator, CompareResult, MetricResult } from '../statistics/types';
import { StatsMap, StatsReport } from '../statistics';
import { compareSimpleMetricResults } from '../statistics/comparators';
import { Config, getAllTasks } from '../config';
import { TaskAim } from '../client/measurement/types';
import { warn } from '../utils/logger';
import { isStatsMap } from '../utils/statsMap';
import getCurrentVersion from '../utils/version';
import { id as staticTaskSubjectId, overrideMetric } from '../stabilizers/staticTask';
import { intersectStabilizers } from '../utils/stabilizers';
import { getAllMetrics } from '../config/metric';

type IncomparableResult = {
    old?: JSONSerializable;
    new: JSONSerializable;
};

export type ComparableResult = {
    old?: MetricResult;
    new: MetricResult;
    change?: CompareResult;
};

type ComparableResultMap = { __comparable: true; modes?: ComparableResultMap[] | IncomparableResult } & {
    [statKey: string]: ComparableResult;
};

type Report = {
    [subjectId: string]: {
        [taskId: string]: IncomparableResult | ComparableResultMap;
    };
};

export type CompareReport = {
    version: string;
    isVersionChanged: boolean;
    timestamp: number;
    hasSignificantNegativeChanges: boolean;
    staticTaskChange?: Report[string];
    stabilizers: string[];
    result: Report;
};

export function isNegativeChange(aim: TaskAim, { difference }: CompareResult): boolean {
    return (aim === 'decrease' && difference > 0) || (aim === 'increase' && difference < 0);
}

function findSignificantNegativeChanges(config: Config, report: Report): boolean {
    const allTasks = getAllTasks(config);
    const taskIdToTaskMap = Object.fromEntries(allTasks.map((task) => [task.id, task]));

    for (const tasks of Object.values(report)) {
        for (const [taskId, result] of Object.entries(tasks)) {
            const taskAim = taskIdToTaskMap[taskId]?.aim;
            const taskShouldFailOnNegativeChanges =
                config.taskConfiguration[taskId]?.failOnSignificantChanges !== false;

            if (!('__comparable' in result) || !taskAim || !taskShouldFailOnNegativeChanges) {
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { __comparable, modes, ...comparableResults } = result;

            for (const [metricId, { change }] of Object.entries(comparableResults)) {
                const metricShouldFailOnNegativeChanges =
                    config.metricConfiguration[metricId]?.failOnSignificantChanges !== false;

                if (
                    change?.significanceRank === 'high' &&
                    isNegativeChange(taskAim, change) &&
                    metricShouldFailOnNegativeChanges
                ) {
                    return true;
                }
            }

            if (Array.isArray(modes)) {
                for (const mode of modes) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { __comparable, modes, value, lowerBound, upperBound, ...comparableResults } = mode;

                    for (const [metricId, { change }] of Object.entries(comparableResults)) {
                        const metricShouldFailOnNegativeChanges =
                            config.metricConfiguration[metricId]?.failOnSignificantChanges !== false;

                        if (
                            change?.significanceRank === 'high' &&
                            isNegativeChange(taskAim, change) &&
                            metricShouldFailOnNegativeChanges
                        ) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    return false;
}

function processMetricResult<T extends MetricResult>(
    config: Config,
    current: T,
    previous?: T,
    comparator?: Comparator<T>,
): ComparableResult {
    if (!previous) {
        return { new: current };
    }
    assert(comparator);

    return {
        old: previous,
        new: current,
        change: comparator(config, current, previous),
    };
}

function processTaskResult(
    config: Config,
    current: JSONSerializable | StatsMap,
    previous?: JSONSerializable | StatsMap,
): IncomparableResult | ComparableResultMap {
    const isCurrentNumber = typeof current === 'number';
    const metricIdToMetricMap = Object.fromEntries(getAllMetrics(config, false).map((metric) => [metric.id, metric]));

    if (!isStatsMap(current) && !isCurrentNumber) {
        const result: IncomparableResult = { new: current };
        if (typeof previous !== 'undefined') result.old = previous;
        return result;
    }

    if (isCurrentNumber) {
        return processMetricResult(
            config,
            current,
            typeof previous === 'number' ? previous : undefined,
            compareSimpleMetricResults,
        );
    }

    // TODO: need output breaking change — do not mix modes with stats.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __statsMap, observations, outliers, value, lowerBound, upperBound, modes, ...restReport } = current;
    const result = { __comparable: true } as ComparableResultMap;

    for (const [currentMetricId, currentMetricResult] of Object.entries(restReport)) {
        const metric = metricIdToMetricMap[currentMetricId];

        assert(metric, 'metric must exist to process');

        const previousMetricResult = isStatsMap(previous) ? previous[currentMetricId] : undefined;
        const isCurrentMetricResultWithError = Array.isArray(currentMetricResult);
        const isPreviousMetricResultWithError = Array.isArray(previousMetricResult);

        if (isCurrentMetricResultWithError !== isPreviousMetricResultWithError) {
            if (previousMetricResult) {
                warn(`Metric ${currentMetricId} changed output`);
            }

            result[currentMetricId] = processMetricResult(config, currentMetricResult);
            continue;
        }

        result[currentMetricId] = processMetricResult<MetricResult>(
            config,
            currentMetricResult,
            previousMetricResult,
            metric.compare as Comparator<MetricResult>,
        );
    }

    const previousModes = isStatsMap(previous) ? previous.modes : undefined;

    if (modes) {
        if (!previousModes) {
            result.modes = {
                new: modes,
            };
        } else if (modes.length !== previousModes.length) {
            result.modes = {
                new: modes,
                old: previousModes,
            };
        } else {
            result.modes = modes.map((mode, i) => {
                return processTaskResult(config, mode, previousModes[i]) as ComparableResultMap;
            });
        }
    }

    return result;
}

function processStaticTaskStabilizer(
    config: Config,
    report: StatsReport,
    staticTaskStabilizerResult: StatsReport[string],
): void {
    const staticTaskResult = staticTaskStabilizerResult as { [k: string]: StatsMap };
    const allTasks = getAllTasks(config);
    const taskIdToTaskMap = new Map(allTasks.map((task) => [task.id, task]));

    for (const subjectResults of Object.values(report)) {
        for (const [taskId, results] of Object.entries(subjectResults)) {
            const task = taskIdToTaskMap.get(taskId);

            if (
                !task ||
                !intersectStabilizers(config, task.availableStabilizers).includes(staticTaskSubjectId) ||
                !isStatsMap(results)
            ) {
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { __statsMap, observations, outliers, modes, ...restReport } = results;
            for (const [metricId, metricResult] of Object.entries(restReport)) {
                results[metricId] = overrideMetric(staticTaskResult[taskId][metricId], metricResult as MetricResult);
            }
        }
    }
}

function processSubjectResult(
    config: Config,
    current: StatsReport[keyof StatsReport],
    previous?: StatsReport[keyof StatsReport],
): Report[keyof Report] {
    const result: Report[keyof Report] = {};

    for (const [currentTaskId, currentTaskReport] of Object.entries(current)) {
        result[currentTaskId] = processTaskResult(config, currentTaskReport, previous?.[currentTaskId]);
    }

    return result;
}

export async function processReports(
    config: Config,
    currentReport: ReportWithMeta,
    previousReport: ReportWithMeta,
): Promise<CompareReport> {
    const { version: currentVersion, result: currentResult, staticTaskResult: currentStaticTaskResult } = currentReport;
    const {
        version: previousVersion,
        result: previousResult,
        staticTaskResult: previousStaticTaskResult,
    } = previousReport;

    const stabilizers = [];
    const isVersionChanged = currentVersion !== previousVersion;
    if (isVersionChanged) {
        warn('Looks like perftool version is changed. Some results may be falsy');
    }

    if (currentStaticTaskResult && previousStaticTaskResult) {
        stabilizers.push(staticTaskSubjectId);

        processStaticTaskStabilizer(config, currentResult, currentStaticTaskResult);
        processStaticTaskStabilizer(config, previousResult, previousStaticTaskResult);
    }

    const result: Report = {};
    for (const [currentSubjectId, currentSubjectReport] of Object.entries(currentResult)) {
        result[currentSubjectId] = processSubjectResult(config, currentSubjectReport, previousResult[currentSubjectId]);
    }
    const staticTaskChange = currentStaticTaskResult
        ? processSubjectResult(config, currentStaticTaskResult, previousStaticTaskResult)
        : undefined;

    const hasSignificantNegativeChanges = findSignificantNegativeChanges(config, result);

    return {
        version: await getCurrentVersion(),
        isVersionChanged,
        timestamp: Date.now(),
        staticTaskChange,
        hasSignificantNegativeChanges,
        stabilizers,
        result,
    };
}
