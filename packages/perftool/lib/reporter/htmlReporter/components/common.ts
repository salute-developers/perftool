import { CompareReport } from '../../../compare/process';
import { comparisonReport, config } from '../data';

export type View = 'summary' | 'components' | 'raw';

export type State = {
    view: View;
    currentComponentId: string | null;
    currentTaskId: string | null;
};

export function componentHasSignificantChanges(component: CompareReport['result'][string]): boolean {
    for (const [taskId, result] of Object.entries(component)) {
        const taskShouldFailOnNegativeChanges = config.taskConfiguration[taskId]?.failOnSignificantChanges !== false;
        if (!('__comparable' in result) || !taskShouldFailOnNegativeChanges) {
            continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __comparable, modes, ...comparableResults } = result;

        for (const [metricId, { change }] of Object.entries(comparableResults)) {
            const metricShouldFailOnNegativeChanges =
                config.metricConfiguration[metricId]?.failOnSignificantChanges !== false;

            if (change?.significanceRank === 'high' && metricShouldFailOnNegativeChanges) {
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

                    if (change?.significanceRank === 'high' && metricShouldFailOnNegativeChanges) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

export function getComponentsWithSignificantChanges() {
    if (!comparisonReport) {
        return [];
    }
    const result = [];

    for (const [subjectId, subjectResult] of Object.entries(comparisonReport.result)) {
        if (componentHasSignificantChanges(subjectResult)) {
            result.push(subjectId);
        }
    }

    return result;
}
