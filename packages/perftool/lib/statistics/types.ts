import { Config } from '../config';

export type SimpleMetricResult = number;
export type MetricResultWithError = [number, number];

export type MetricResult = SimpleMetricResult | MetricResultWithError;

export type Comparator<T extends MetricResult> = (config: Config, current: T, previous: T) => CompareResult;

export type MetricUsage = 'wholeSample' | 'perMode';

export type Metric<T extends MetricResult> = {
    id: string;
    name: string;
    compare: Comparator<T>;
    /**
     * default: ['perMode']
     */
    usage?: MetricUsage[];
    compute: (observations: number[]) => T;
};

export type SignificanceRank = 'low' | 'medium' | 'high';

export type CompareResult = {
    difference: number;
    percentage: number;
    significanceRank?: SignificanceRank;
};
