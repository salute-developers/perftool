import os from 'os';
import { Configuration as WebpackConfig } from 'webpack';
import { PuppeteerNodeLaunchOptions } from 'puppeteer';
import merge from 'deepmerge';

import { Task, MeasurerConfig } from '../client/measurement/types';
import { ExportPickRule } from '../build/collect';
import { Metric } from '../statistics/types';
import { debug } from '../utils/logger';

import { cacheDirectory } from './paths';

type MetricConfiguration = {
    enable?: boolean;
    confidenceLevel?: number;
    failOnSignificantChanges?: boolean;
};

type TaskConfiguration = MeasurerConfig & {
    enable?: boolean;
    include?: string[];
    exclude?: string[];
    retries?: number;
    failOnSignificantChanges?: boolean;
    metrics?: {
        include?: string[];
        exclude?: string[];
    };
};

// TODO add comments
export type Config = {
    taskConfiguration: {
        [key: string]: TaskConfiguration;
    };
    tasks: Task<any, any>[];
    metricConfiguration: {
        [key: string]: MetricConfiguration;
    };
    stabilizers: string[];
    absoluteError: number;
    metrics: Metric<any>[];
    include: string[];
    exclude: string[];
    jobs: number;
    retries: number;
    baseBranchRef?: string;
    currentBranchRef?: string;
    cache: {
        taskState?: boolean;
    };
    cacheDirectory: string;
    cacheExpirationTime: number;
    displayIntermediateCalculations: boolean;
    intermediateRefreshInterval: number;
    failOnSignificantChanges: boolean;
    outputFilePath: string;
    configPath?: string;
    logLevel: 'quiet' | 'normal' | 'verbose';
    puppeteerOptions: PuppeteerNodeLaunchOptions;
    taskWaitTimeout: number;
    runWaitTimeout: number;
    dryRunTimes: number;
    modifyWebpackConfig: (defaultConfig: WebpackConfig) => WebpackConfig;
    exportPickRule: ExportPickRule;
};

export type ProjectConfig = Partial<Omit<Config, 'configPath' | 'logLevel'>>;

export type CliConfig = Partial<
    Pick<
        Config,
        | 'include'
        | 'configPath'
        | 'outputFilePath'
        | 'logLevel'
        | 'failOnSignificantChanges'
        | 'baseBranchRef'
        | 'currentBranchRef'
    >
>;

function withDefault<T>(value: T | undefined, defaultValue: T): T {
    if (typeof value === 'undefined') {
        return defaultValue;
    }

    return value;
}

export function getConfig(cliConfig: CliConfig = {}, projectConfig: ProjectConfig = {}): Config {
    debug('getting final config');
    const mixedInputConfig = merge(projectConfig, cliConfig);

    const result = {
        taskConfiguration: withDefault(mixedInputConfig.taskConfiguration, {}),
        tasks: withDefault(mixedInputConfig.tasks, []),
        metricConfiguration: withDefault(mixedInputConfig.metricConfiguration, {}),
        stabilizers: withDefault(mixedInputConfig.stabilizers, []),
        absoluteError: withDefault(mixedInputConfig.absoluteError, 0),
        metrics: withDefault(mixedInputConfig.metrics, []),
        include: withDefault(mixedInputConfig.include, []),
        exclude: withDefault(mixedInputConfig.exclude, []),
        jobs: withDefault(mixedInputConfig.jobs, Math.max(os.cpus().length - 1, 1)),
        retries: withDefault(mixedInputConfig.retries, 10),
        baseBranchRef: withDefault(mixedInputConfig.baseBranchRef, undefined),
        currentBranchRef: withDefault(mixedInputConfig.currentBranchRef, undefined),
        cache: withDefault(mixedInputConfig.cache, {}),
        cacheDirectory: withDefault(mixedInputConfig.cacheDirectory, cacheDirectory),
        cacheExpirationTime: withDefault(mixedInputConfig.cacheExpirationTime, 0),
        displayIntermediateCalculations: withDefault(mixedInputConfig.displayIntermediateCalculations, true),
        intermediateRefreshInterval: withDefault(mixedInputConfig.intermediateRefreshInterval, 10000),
        failOnSignificantChanges: withDefault(mixedInputConfig.failOnSignificantChanges, true),
        outputFilePath: withDefault(mixedInputConfig.outputFilePath, 'perftest/report-[time].json'),
        configPath: withDefault(mixedInputConfig.configPath, undefined),
        logLevel: withDefault(mixedInputConfig.logLevel, 'normal'),
        puppeteerOptions: withDefault(mixedInputConfig.puppeteerOptions, {}),
        taskWaitTimeout: withDefault(mixedInputConfig.taskWaitTimeout, 1000 * 10),
        runWaitTimeout: withDefault(mixedInputConfig.runWaitTimeout, 1000 * 60 * 2),
        dryRunTimes: withDefault(mixedInputConfig.taskWaitTimeout, 1),
        modifyWebpackConfig: withDefault(mixedInputConfig.modifyWebpackConfig, (c) => c),
        exportPickRule: withDefault(mixedInputConfig.exportPickRule, 'named'),
    };

    debug('final config: ', result);

    return result;
}
