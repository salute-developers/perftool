// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jstat from 'jstat';

/**
 * Computes Harrell-Davis quantile estimator
 *
 * https://aakinshin.net/posts/harrell-davis-double-mad-outlier-detector/#Harrell1982
 * https://github.com/scipy/scipy/blob/v1.11.4/scipy/stats/_mstats_extras.py#L28-L100
 */
export function hdQuantiles(data: number[], quantiles: number[]): number[] {
    if (data.length < 2) {
        return quantiles.map(() => data[0] || 0);
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    return quantiles.map((q) => {
        switch (q) {
            case 0:
                return sorted[0];
            case 1:
                return sorted[sorted.length - 1];
            default:
        }

        const weightsRaw = [...Array(n + 1)].map((_, i) => jstat.beta.cdf(i / n, (n + 1) * q, (n + 1) * (1 - q)));

        const weights = [];
        for (let i = 1; i < weightsRaw.length; ++i) {
            weights.push(weightsRaw[i] - weightsRaw[i - 1]);
        }

        return jstat.dot(weights, sorted);
    });
}

/**
 * Quantile-respectful density estimation based on the Harrell-Davis quantile estimator
 * https://aakinshin.net/posts/qrde-hd/
 */
export function qrdeHD(data: number[], precision: number) {
    const k = Math.trunc(1 / precision);
    const points = [...Array(k + 1)].map((_, i) => i / k);
    const quantiles = hdQuantiles(data, points);
    const widths = quantiles.map((q, i) => quantiles[i + 1] - q);
    widths.pop();

    const heights = widths.map((w) => precision / w);

    return {
        quantiles,
        widths,
        heights,
    };
}

/**
 * Beta-distribution noise based jitter
 * https://aakinshin.net/posts/discrete-sample-jittering
 * @param data — sorted sample
 * @param factor
 */
export function jitter(data: number[], factor = 1.5): number[] {
    let before = 0;
    let after = data.length;
    let rowCount = 1;

    return data.reduce((acc, v, i) => {
        --after;

        if (v === data[i + 1]) {
            ++rowCount;
            return acc;
        }

        if (rowCount === 1) {
            ++before;
            acc.push(v);
            return acc;
        }

        const alpha = (9 * before + after) / (before + after);
        const beta = (before + 9 * after) / (before + after);
        const mode = before / (before + after);
        const noise = [...Array(rowCount)].map((_, j) => jstat.beta.inv((j + 1) / (rowCount + 1), alpha, beta));
        const closestModeIndex = noise
            .map((n) => Math.abs(n - mode))
            .reduce((min, n, j, values) => (values[min] > n ? j : min), 0);
        const jitteredValues = noise.map((n) => v + factor * (n - noise[closestModeIndex]));

        acc.push(...jitteredValues);

        rowCount = 1;
        ++before;

        return acc;
    }, [] as number[]);
}

export type Mode = {
    value: number;
    lowerBound: number;
    upperBound: number;
    sample: number[];
};

/**
 * Lowland multimodality detection
 * https://aakinshin.net/posts/lowland-multimodality-detection/
 */
export function getModes(data: number[], precision = 1 / Math.min(100, data.length / 2), sensitivity = 0.75): Mode[] {
    data.sort((a, b) => a - b);
    data = jitter(data);

    const { quantiles, widths, heights } = qrdeHD(data, precision);
    const deepPonds = getDeepPonds({ heights, widths, sensitivity });

    const modes = [] as number[];

    for (let i = 0; i < deepPonds.length - 1; ++i) {
        const [, currentEnd] = deepPonds[i];
        const [nextStart] = deepPonds[i + 1];
        modes.push(findMax(heights, currentEnd + 1, nextStart));
    }

    const result = [] as Mode[];

    for (let i = 0; i < modes.length; ++i) {
        const isFirst = i === 0;
        const isLast = i === modes.length - 1;

        const res: Mode = {
            value: quantiles[modes[i]],
            lowerBound: quantiles[0],
            upperBound: quantiles[quantiles.length - 1],
            sample: [],
        };

        if (!isFirst) {
            const prevMode = result[result.length - 1];
            res.lowerBound = quantiles[Math.ceil((modes[i] - modes[i - 1]) / 2)];
            prevMode.upperBound = quantiles[Math.floor((modes[i] - modes[i - 1]) / 2)];
            prevMode.sample = data.filter((v) => v >= prevMode.lowerBound && v <= prevMode.upperBound);
        }

        if (isLast) {
            res.sample = data.filter((v) => v >= res.lowerBound && v <= res.upperBound);
        }

        result.push(res);
    }

    return result;
}

type GetDeepPondsParams = {
    heights: number[];
    widths: number[];
    sensitivity: number;
};

function getDeepPonds({ heights, widths, sensitivity }: GetDeepPondsParams) {
    const waterHeight = getWaterHeight(heights);

    const deepPonds: [number, number][] = [[0, 0]];
    let currentStart = 0;
    let currentWaterArea = 0;
    let currentGroundArea = 0;

    for (let i = 0; i < heights.length - 1; ++i) {
        const currentWaterHeight = waterHeight[i];
        const nextWaterHeight = waterHeight[i + 1];

        // Calculate current pond heights
        if (currentWaterHeight > 0) {
            currentWaterArea += waterHeight[i] * widths[i];
            currentGroundArea += heights[i] * widths[i];
        }

        // Moving from water to ground
        if (currentWaterHeight > 0 && nextWaterHeight <= 0) {
            // If the current pond is deep water, save it
            if (currentWaterArea > sensitivity * (currentWaterArea + currentGroundArea)) {
                deepPonds.push([currentStart, i]);
            }
        }

        // Moving from ground to water
        if (currentWaterHeight <= 0 && nextWaterHeight > 0) {
            currentStart = i + 1;
            currentWaterArea = 0;
            currentGroundArea = 0;
        }
    }

    deepPonds.push([heights.length - 1, heights.length - 1]);
    return deepPonds;
}

function findMax(values: number[], from = 0, to = values.length) {
    let max = from;
    for (let i = from + 1; i < to && i < values.length && from < to; ++i) {
        if (values[max] < values[i]) max = i;
    }
    return max;
}

function getWaterHeight(heights: number[]): number[] {
    let left = 0;
    let right = heights.length - 1;
    let lMax = heights[left];
    let rMax = heights[right];

    const waterHeigth: number[] = [];
    waterHeigth[left] = lMax - heights[left];
    waterHeigth[right] = rMax - heights[right];

    while (left < right) {
        if (lMax < rMax) {
            ++left;
            lMax = Math.max(lMax, heights[left]);
            waterHeigth[left] = lMax - heights[left];
        } else {
            --right;
            rMax = Math.max(rMax, heights[right]);
            waterHeigth[right] = rMax - heights[right];
        }
    }

    return waterHeigth;
}

export function hdMedian(data: number[]): number {
    const [result] = hdQuantiles(data, [0.5]);
    return result;
}
