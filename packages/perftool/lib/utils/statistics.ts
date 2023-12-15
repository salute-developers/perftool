// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jstat from 'jstat';

/**
 * Computes Harrell-Davis quantile estimator
 *
 * https://aakinshin.net/posts/harrell-davis-double-mad-outlier-detector/#Harrell1982
 * https://github.com/scipy/scipy/blob/v1.11.4/scipy/stats/_mstats_extras.py#L28-L100
 */
export function hdQuantile(data: number[], p: number): number {
    if (data.length < 2) {
        return data[0] || 0;
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    switch (p) {
        case 0:
            return sorted[0];
        case 1:
            return sorted[sorted.length - 1];
        default:
    }

    const weightsRaw = [...Array(n + 1)].map((_, i) => jstat.beta.cdf(i / n, (n + 1) * p, (n + 1) * (1 - p)));

    const weights = [];
    for (let i = 1; i < weightsRaw.length; ++i) {
        weights.push(weightsRaw[i] - weightsRaw[i - 1]);
    }

    return jstat.dot(weights, sorted);
}

export function hdMedian(data: number[]): number {
    return hdQuantile(data, 0.5);
}
