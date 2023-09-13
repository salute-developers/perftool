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
    failOnSignificantChanges?: boolean;
};

type TaskConfiguration = MeasurerConfig & {
    enable?: boolean;
    failOnSignificantChanges?: boolean;
};

export type Config = {
    /** Normal mode for test run, preview mode for checking how components are rendered. Default: 'normal' **/
    mode: 'normal' | 'preview';
    /** Configuration for each task, keyed by taskId (e.g. render/rerender). Can be used for custom tasks also **/
    taskConfiguration: {
        [key: string]: TaskConfiguration;
    };
    /** Custom tasks **/
    tasks: Task<any, any>[];
    /** Configuration for each task, keyed by metricId (e.g. mean/median) **/
    metricConfiguration: {
        [key: string]: MetricConfiguration;
    };
    /** Output stabilizer. Available: 'staticTask'. Default: ['staticTask'] **/
    stabilizers: string[];
    /** Absolute error that summed with actual metric error when comparing. Default: 1 **/
    absoluteError: number;
    /** Custom metrics **/
    metrics: Metric<any>[];
    /** Which modules to include for testing (glob) **/
    include: string[];
    /** Which modules to exclude for testing (glob) **/
    exclude: string[];
    /** Number of jobs. Default: os.cpus() - 1 **/
    jobs: number;
    /** Number of retries for non-idempotent tasks. Default: 10 **/
    retries: number;
    /** Base vcs branch name or any id. Used to find base branch cache file. **/
    baseBranchRef?: string;
    /**
     *  Current vcs branch name or any id. Used for current cache filename.
     *  Default: current git branch ref if possible to get.
     **/
    currentBranchRef?: string;
    /** Cache settings **/
    cache: {
        /** Use task state cache (speeds up next runs). Default: false **/
        taskState?: boolean;
        /** Use subjects deps cache (run only changed test modules). Default: false **/
        testSubjectsDeps?: boolean;
    };
    /** Cache directory path. Default: .perftool/cache **/
    cacheDirectory: string;
    /** Cache file TTL. Default: 0 (no TTL) **/
    cacheExpirationTime: number;
    /** Show partial results once in a *intermediateRefreshInterval* when testing. Default: true **/
    displayIntermediateCalculations: boolean;
    /** Time in which intermediate calculations are displayed, ms. Default: 10000 **/
    intermediateRefreshInterval: number;
    /** Fail if some metric changed badly significantly. Default: true **/
    failOnSignificantChanges: boolean;
    /** Where to save testing report. Default: 'perftest/report-[time].json' **/
    outputFilePath: string;
    /** Path to perftool config. Default: perftool.config.(mts|mjs) **/
    configPath?: string;
    /** Logging verbosity level. Default: 'normal' **/
    logLevel: 'quiet' | 'normal' | 'verbose';
    /** Custom puppeteer options **/
    puppeteerOptions: PuppeteerNodeLaunchOptions;
    /** Task complete timeout. Default: 10000 ms **/
    taskWaitTimeout: number;
    /** Client app result waiting timeout. Default: 120000 ms **/
    runWaitTimeout: number;
    /** How many times to run the tasks without saving the results. Default: 1 **/
    dryRunTimes: number;
    /** Function used to modify webpack config. Default: identity **/
    modifyWebpackConfig: (defaultConfig: WebpackConfig) => WebpackConfig;
    /** Which exports to pick. Default: 'named' **/
    exportPickRule: ExportPickRule;
};

export type ProjectConfig = Partial<Omit<Config, 'configPath' | 'logLevel' | 'mode'>>;

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
        | 'mode'
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
        mode: withDefault(mixedInputConfig.mode, 'normal'),
        taskConfiguration: withDefault(mixedInputConfig.taskConfiguration, {}),
        tasks: withDefault(mixedInputConfig.tasks, []),
        metricConfiguration: withDefault(mixedInputConfig.metricConfiguration, {}),
        stabilizers: withDefault(mixedInputConfig.stabilizers, ['staticTask']),
        absoluteError: withDefault(mixedInputConfig.absoluteError, 1),
        metrics: withDefault(mixedInputConfig.metrics, []),
        include: withDefault(mixedInputConfig.include, []),
        exclude: withDefault(mixedInputConfig.exclude, []),
        jobs: withDefault(mixedInputConfig.jobs, Math.max(os.cpus().length - 1, 1)),
        retries: withDefault(mixedInputConfig.retries, 30),
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
