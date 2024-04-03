import nativeMetrics from '../statistics/metrics';

import type { Config } from './common';

export const defaultMetricConfiguration = {
    median: {
        failOnSignificantChanges: false,
    },
    gMean: {
        failOnSignificantChanges: false,
    },
    hMean: {
        failOnSignificantChanges: false,
    },
    iqr: {
        failOnSignificantChanges: false,
    },
    idr: {
        failOnSignificantChanges: false,
    },
    midhinge: {
        failOnSignificantChanges: false,
    },
    trimean: {
        failOnSignificantChanges: false,
    },
    truncMean5: {
        failOnSignificantChanges: false,
    },
    truncMean10: {
        failOnSignificantChanges: false,
    },
    truncMean25: {
        failOnSignificantChanges: false,
    },
    hl: {
        failOnSignificantChanges: false,
    },
};

export function getAllMetrics(config: Pick<Config, 'metricConfiguration' | 'metrics'>) {
    return [...config.metrics, ...nativeMetrics].filter((metric) => {
        const metricConfig = config.metricConfiguration[metric.id] || {};

        return metricConfig.enable === undefined ? true : metricConfig.enable;
    });
}
