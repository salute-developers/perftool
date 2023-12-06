// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jstat from 'jstat';

import { compareMetricWithError, compareSimpleMetricResults } from './comparators';
import { Metric, MetricResultWithError, SimpleMetricResult } from './types';

const { jStat } = jstat;

const median: Metric<MetricResultWithError> = {
    id: 'median',
    name: 'Median',
    compare: compareMetricWithError,
    compute: (observations) => {
        const result = jStat.median(observations);
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const mean: Metric<MetricResultWithError> = {
    id: 'mean',
    name: 'Mean',
    compare: compareMetricWithError,
    compute: (observations) => {
        const result = jStat.mean(observations);
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const gMean: Metric<MetricResultWithError> = {
    id: 'gMean',
    name: 'Geometric Mean',
    compare: compareMetricWithError,
    compute: (observations) => {
        const result = jStat.geomean(observations);
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const hMean: Metric<MetricResultWithError> = {
    id: 'hMean',
    name: 'Harmonic Mean',
    compare: compareMetricWithError,
    compute: (observations) => {
        let n = observations.length;

        const denom = observations.reduce((acc, obs) => {
            if (obs === 0) {
                n -= 1;
                return acc;
            }

            return acc + 1 / obs;
        }, 0);

        const result = denom ? n / denom : 0;
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const iqr: Metric<MetricResultWithError> = {
    id: 'iqr',
    name: 'Interquartile range',
    compare: compareMetricWithError,
    compute: (observations) => {
        const quartiles = jStat.quartiles(observations);
        const result = quartiles[2] - quartiles[0];
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const idr: Metric<MetricResultWithError> = {
    id: 'idr',
    name: 'Interdecile range',
    compare: compareMetricWithError,
    compute: (observations) => {
        const deciles = jStat.quantiles(observations, [0.1, 0.9]);
        const result = deciles[1] - deciles[0];
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const midhinge: Metric<MetricResultWithError> = {
    id: 'midhinge',
    name: 'Midhinge',
    compare: compareMetricWithError,
    compute: (observations) => {
        const quartiles = jStat.quartiles(observations);
        const result = (quartiles[0] + quartiles[2]) / 2;
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const trimean: Metric<MetricResultWithError> = {
    id: 'trimean',
    name: 'Trimean',
    compare: compareMetricWithError,
    compute: (observations) => {
        const quartiles = jStat.quartiles(observations);
        const result = (quartiles[0] + 2 * quartiles[1] + quartiles[2]) / 4;
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const truncMean5: Metric<MetricResultWithError> = {
    id: 'truncMean5',
    name: '5% Truncated Mean',
    compare: compareMetricWithError,
    compute: (observations) => {
        const quantiles = jStat.quantiles(observations, [0.05, 0.95]);
        const trimmedObservations = observations.filter((s) => s >= quantiles[0] && s <= quantiles[1]);
        const result = jStat.mean(trimmedObservations);
        const error = jStat.normalci(result, 0.01, trimmedObservations)[1] - result;

        return [result, error];
    },
};

const truncMean10: Metric<MetricResultWithError> = {
    id: 'truncMean10',
    name: '10% Truncated Mean',
    compare: compareMetricWithError,
    compute: (observations) => {
        const quantiles = jStat.quantiles(observations, [0.1, 0.9]);
        const trimmedObservations = observations.filter((s) => s >= quantiles[0] && s <= quantiles[1]);
        const result = jStat.mean(trimmedObservations);
        const error = jStat.normalci(result, 0.01, trimmedObservations)[1] - result;

        return [result, error];
    },
};

const truncMean25: Metric<MetricResultWithError> = {
    id: 'truncMean25',
    name: '25% Truncated Mean',
    compare: compareMetricWithError,
    compute: (observations) => {
        const quantiles = jStat.quantiles(observations, [0.25, 0.75]);
        const trimmedObservations = observations.filter((s) => s >= quantiles[0] && s <= quantiles[1]);
        const result = jStat.mean(trimmedObservations);
        const error = jStat.normalci(result, 0.01, trimmedObservations)[1] - result;

        return [result, error];
    },
};

const hl: Metric<MetricResultWithError> = {
    id: 'hl',
    name: 'Hodges-Lehmann estimator',
    compare: compareMetricWithError,
    compute: (observations) => {
        const pairMeans = [];

        for (let i = 0; i < observations.length; ++i) {
            for (let j = i + 1; j < observations.length; ++j) {
                const res = (observations[i] + observations[j]) / 2;
                pairMeans.push(res);
            }
        }

        const result = jStat.median(pairMeans);
        const error = jStat.normalci(result, 0.01, observations)[1] - result;

        return [result, error];
    },
};

const stdev: Metric<SimpleMetricResult> = {
    id: 'stdev',
    name: 'Standard Deviation',
    compare: compareSimpleMetricResults,
    compute: (observations) => {
        return jStat.stdev(observations);
    },
};

export default [
    median,
    mean,
    gMean,
    hMean,
    iqr,
    idr,
    midhinge,
    trimean,
    truncMean5,
    truncMean10,
    truncMean25,
    hl,
    stdev,
];
