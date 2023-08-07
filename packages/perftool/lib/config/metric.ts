import nativeMetrics from '../statistics/metrics';

import { Config } from './common';

export function getAllMetrics(config: Config) {
    return [...config.metrics, ...nativeMetrics].filter((metric) => {
        const metricConfig = config.metricConfiguration[metric.id] || {};

        return metricConfig.enable === undefined ? true : metricConfig.enable;
    });
}
