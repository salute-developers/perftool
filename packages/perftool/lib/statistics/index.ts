import { Config } from '../config';
import { Task } from '../client/measurement/types';
import { RunTaskResult } from '../client/measurement/runner';
import { JSONSerializable } from '../utils/types';
import Deferred, { defer } from '../utils/deferred';
import { id as staticTaskSubjectId } from '../stabilizers/staticTask';
import { getAllMetrics } from '../config/metric';
import { separateOutliers } from '../utils/outlierDetection';
import { getModes, Mode as RawMode } from '../utils/statistics';

import { MetricResult, MetricUsage } from './types';

type Mode = Pick<RawMode, 'value' | 'lowerBound' | 'upperBound'> & StatsMap;

export type StatsMap = { __statsMap: true; observations: number[]; outliers?: number[]; modes?: Mode[] } & {
    [statKey: string]: MetricResult;
};

export type StatsReport = {
    [subjectId: string]: {
        [taskId: string]: JSONSerializable | StatsMap;
    };
};

export default class Statistics<T extends Task<any, any>[]> {
    config: Config;

    computableObservations: Map<string, Map<T[number]['id'], number[]>> = new Map();

    bypassedObservations: Map<string, Map<T[number]['id'], JSONSerializable>> = new Map();

    taskIdToTaskMap: Map<T[number]['id'], T[number]>;

    isConsuming = false;

    private consumingFinishedCallback: (() => void) | null = null;

    private consumingPromise: Promise<void> | null = null;

    constructor(config: Config, tasks: T) {
        this.config = config;

        this.taskIdToTaskMap = new Map(tasks.map((task) => [task.id, task]));
    }

    private addObservation({ taskId, subjectId, ...rest }: RunTaskResult<T[number]>): void {
        if (!('result' in rest)) {
            return;
        }

        if (typeof rest.result !== 'number' || this.taskIdToTaskMap.get(taskId)?.isIdempotent) {
            if (!this.bypassedObservations.has(subjectId)) {
                this.bypassedObservations.set(
                    subjectId,
                    new Map([[taskId, rest.result as unknown as JSONSerializable]]),
                );
            }

            return;
        }

        if (!this.computableObservations.has(subjectId)) {
            this.computableObservations.set(subjectId, new Map([[taskId, [rest.result]]]));
            return;
        }

        if (!this.computableObservations.get(subjectId)?.has(taskId)) {
            this.computableObservations.get(subjectId)?.set(taskId, [rest.result]);
            return;
        }

        this.computableObservations.get(subjectId)?.get(taskId)?.push(rest.result);
    }

    private waitForConsumeEnd(): Promise<void> {
        if (!this.isConsuming) {
            return Promise.resolve();
        }

        if (!this.consumingPromise) {
            const def = new Deferred<void>();
            this.consumingPromise = def.promise;
            this.consumingFinishedCallback = def.resolve;
        }

        return this.consumingPromise;
    }

    private separateOutliers(observations: number[]): { observations: number[]; outliers?: number[] } {
        if (!this.config.separateOutliers) {
            return { observations };
        }

        return separateOutliers(observations);
    }

    async consume(source: AsyncGenerator<RunTaskResult<T[number]>, undefined>): Promise<void> {
        this.isConsuming = true;

        for await (const result of source) {
            if (!this.isConsuming) {
                break;
            }

            this.addObservation(result);
        }

        this.isConsuming = false;
        this.consumingFinishedCallback?.();
    }

    addObservations(results: RunTaskResult<T[number]>[]): void {
        results.forEach((res) => {
            this.addObservation(res);
        });
    }

    async *stream(): AsyncGenerator<StatsReport, undefined> {
        while (this.isConsuming) {
            await Promise.race([defer(this.config.intermediateRefreshInterval), this.waitForConsumeEnd()]);

            yield this.getResult();
        }

        return undefined;
    }

    processMode(mode: RawMode): Mode {
        const { sample, ...modeInfo } = mode;
        const separatedResult = this.separateOutliers(sample);
        const result = { __statsMap: true, ...separatedResult, ...modeInfo } as Mode;

        this.processObservations(result, separatedResult.observations, 'perMode');

        return result;
    }

    processModes(results: number[]): { modes?: Mode[] } {
        if (!this.config.useModeAnalysis) {
            return {};
        }

        return {
            modes: getModes(results).map((mode) => this.processMode(mode)),
        };
    }

    processObservations(acc: StatsMap, observations: number[], type: MetricUsage, withAbsoluteError = true) {
        // Presort for faster median and quantiles
        const filteredObservations = [...observations].sort((a, b) => a - b);
        for (const metric of getAllMetrics(this.config)) {
            const metricUsage = metric.usage || ['perMode'];

            if (this.config.useModeAnalysis && !metricUsage.includes(type)) {
                continue;
            }

            const metricResult = metric.compute(filteredObservations);

            if (Array.isArray(metricResult) && withAbsoluteError) {
                metricResult[1] += this.config.absoluteError;
            }

            acc[metric.id] = metricResult;
        }
    }

    getResult(): StatsReport {
        // TODO feedback & restart for more
        const report: StatsReport = {};

        for (const [subjectId, value] of this.bypassedObservations) {
            report[subjectId] = Object.fromEntries(value);
        }

        for (const [subjectId, tasksResult] of this.computableObservations) {
            report[subjectId] = report[subjectId] || {};

            for (const [taskId, results] of tasksResult) {
                const separatedResult = this.separateOutliers(results);

                report[subjectId][taskId] = report[subjectId][taskId] || {
                    __statsMap: true,
                    ...this.processModes(results),
                    ...separatedResult,
                };

                this.processObservations(
                    report[subjectId][taskId] as StatsMap,
                    separatedResult.observations,
                    'wholeSample',
                    subjectId !== staticTaskSubjectId,
                );
            }
        }

        return report;
    }

    clear() {
        this.isConsuming = false;
        this.consumingFinishedCallback?.();
        this.computableObservations.clear();
    }
}
