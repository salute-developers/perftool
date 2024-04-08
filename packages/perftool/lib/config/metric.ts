import nativeMetrics from '../statistics/metrics';

import type { Config } from './common';

export const defaultMetricConfiguration = {
    median: {
        failOnSignificantChanges: false,
        enable: false,
    },
    gMean: {
        failOnSignificantChanges: false,
        enable: false,
    },
    hMean: {
        failOnSignificantChanges: false,
        enable: false,
    },
    iqr: {
        failOnSignificantChanges: false,
        enable: false,
    },
    idr: {
        failOnSignificantChanges: false,
        enable: false,
    },
    midhinge: {
        failOnSignificantChanges: false,
    },
    trimean: {
        failOnSignificantChanges: false,
    },
    truncMean5: {
        failOnSignificantChanges: false,
        enable: false,
    },
    truncMean10: {
        failOnSignificantChanges: false,
        enable: false,
    },
    truncMean25: {
        failOnSignificantChanges: false,
        enable: false,
    },
    hl: {
        failOnSignificantChanges: false,
    },
};

export function getAllMetrics(config: Pick<Config, 'metricConfiguration' | 'metrics'>, filterDisabled = true) {
    return [...config.metrics, ...nativeMetrics].filter((metric) => {
        if (!filterDisabled) return true;

        const metricConfig = config.metricConfiguration[metric.id] || {};

        return metricConfig.enable === undefined ? true : metricConfig.enable;
    });
}
