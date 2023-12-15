// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jstat from 'jstat';

import { hdMedian } from './statistics';

export function separateOutliers(data: number[]): { observations: number[]; outliers: number[] } {
    const median = hdMedian(data);
    const lowerDeviations: number[] = jstat.abs(data.filter((v) => v <= median).map((v) => v - median));
    const upperDeviations: number[] = jstat.abs(data.filter((v) => v >= median).map((v) => v - median));
    const lowerMAD = 1.4826 * hdMedian(lowerDeviations);
    const upperMAD = 1.4826 * hdMedian(upperDeviations);
    const lowerBound = median - 3 * lowerMAD;
    const upperBound = median + 3 * upperMAD;

    return data.reduce(
        (acc, v) => {
            if (v >= lowerBound && v <= upperBound) {
                acc.observations.push(v);
            } else {
                acc.outliers.push(v);
            }

            return acc;
        },
        { observations: [] as number[], outliers: [] as number[] },
    );
}
