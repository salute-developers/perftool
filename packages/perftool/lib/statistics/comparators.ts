import assert from '../utils/assert';

import { Comparator, MetricResultWithError, SignificanceRank, SimpleMetricResult } from './types';

export const compareMetricWithError: Comparator<MetricResultWithError> = function (config, current, previous) {
    assert(Array.isArray(current) && Array.isArray(previous));

    const [currentVal, currentError] = current;
    const [previousVal, previousError] = previous;

    const difference = currentVal - previousVal;
    const absolute = Math.abs(difference);
    const percentage = +((100 * difference) / previousVal).toFixed(2);
    let significanceRank: SignificanceRank;

    if (absolute > currentError + previousError + config.significanceThreshold * previousVal) {
        significanceRank = 'high';
    } else if (absolute > currentError && absolute > previousError) {
        significanceRank = 'medium';
    } else {
        significanceRank = 'low';
    }

    return {
        difference,
        percentage,
        significanceRank,
    };
};

export const compareSimpleMetricResults: Comparator<SimpleMetricResult> = function (_config, current, previous) {
    assert(typeof current === 'number' && typeof previous === 'number');

    const difference = current - previous;
    const percentage = +((100 * difference) / previous).toFixed(2);

    return {
        difference,
        percentage,
    };
};
