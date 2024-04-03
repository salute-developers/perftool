import os from 'os';
import { Configuration as WebpackConfig } from 'webpack';
import { PuppeteerNodeLaunchOptions } from 'puppeteer';
import merge from 'deepmerge';

import { Task, MeasurerConfig } from '../client/measurement/types';
import { ExportPickRule } from '../build/collect';
import { Metric } from '../statistics/types';
import { debug } from '../utils/logger';
import { IS_CI_ENVIRONMENT } from '../utils/ci';

import { cacheDirectory } from './paths';
import { defaultMetricConfiguration } from './metric';

type MetricConfiguration = {
    enable?: boolean;
    failOnSignificantChanges?: boolean;
};

type TaskConfiguration = MeasurerConfig & {
    enable?: boolean;
    failOnSignificantChanges?: boolean;
};

export type PerftoolMode = 'normal' | 'collaborative' | 'preview' | 'child';

export type Config = {
    /**
     * Normal mode for test run, preview mode for checking how components are rendered.
     * Child mode for collaborative run for two versions of the project
     * Default: 'normal'
     **/
    mode: PerftoolMode;
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
    /** Detect outliers and exclude them from statistics **/
    separateOutliers: boolean;
    /** Detect modes and compute metrics for each mode vicinity **/
    useModeAnalysis: boolean;
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
    /** Number of test timeouts in a row before exit with error **/
    maxTimeoutsInRow: number;
    /** Function used to modify webpack config. Default: identity **/
    modifyWebpackConfig: (defaultConfig: WebpackConfig) => WebpackConfig;
    /** Which exports to pick. Default: 'named' **/
    exportPickRule: ExportPickRule;
    /**
     * Path to the directory of the baseline version of the project,
     * which is compared to the current version.
     **/
    baselineRefDir?: string;
    /** In collaborative mode, consequently compare the reports **/
    compareAtOnce: boolean;
    /** In collaborative mode, output path of the baseline report **/
    baselineOutputPath: string;
    /** In collaborative mode, output path of the comparison report **/
    compareOutputPath: string;
    /** Output path of the visual report **/
    visualReportOutputPath: string;
};

export type ProjectConfig = Partial<Omit<Config, 'configPath' | 'logLevel' | 'mode' | 'baselineRefDir'>>;

export type ClientConfig = Pick<
    Config,
    'tasks' | 'taskConfiguration' | 'metrics' | 'metricConfiguration' | 'logLevel' | 'taskWaitTimeout'
>;

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
        | 'baselineRefDir'
        | 'baselineOutputPath'
        | 'compareOutputPath'
        | 'visualReportOutputPath'
        | 'mode'
    >
>;

function withDefault<T>(value: T | undefined, defaultValue: T, deep = false): T {
    if (typeof value === 'undefined') {
        return defaultValue;
    }

    if (deep) {
        return merge(defaultValue, value);
    }

    return value;
}

export function getConfig(cliConfig: CliConfig = {}, projectConfig: ProjectConfig = {}): Config {
    debug('getting final config');
    const mixedInputConfig = merge(projectConfig, cliConfig);

    const mode = withDefault(mixedInputConfig.mode, 'normal');

    const result: Config = {
        mode,
        taskConfiguration: withDefault(mixedInputConfig.taskConfiguration, {}),
        tasks: withDefault(mixedInputConfig.tasks, []),
        metricConfiguration: withDefault(mixedInputConfig.metricConfiguration, defaultMetricConfiguration, true),
        stabilizers: withDefault(mixedInputConfig.stabilizers, ['staticTask']),
        separateOutliers: withDefault(mixedInputConfig.separateOutliers, true),
        useModeAnalysis: withDefault(mixedInputConfig.useModeAnalysis, true),
        absoluteError: withDefault(mixedInputConfig.absoluteError, 1),
        metrics: withDefault(mixedInputConfig.metrics, []),
        include: withDefault(mixedInputConfig.include, ['**/*.perftest.tsx']),
        exclude: withDefault(mixedInputConfig.exclude, ['**/node_modules/**']),
        jobs: withDefault(mixedInputConfig.jobs, Math.max(os.cpus().length - 1, 1)),
        retries: withDefault(mixedInputConfig.retries, 50),
        baseBranchRef: withDefault(mixedInputConfig.baseBranchRef, undefined),
        currentBranchRef: withDefault(mixedInputConfig.currentBranchRef, undefined),
        cache: withDefault(
            mixedInputConfig.cache,
            IS_CI_ENVIRONMENT
                ? {
                      taskState: true,
                      testSubjectsDeps: true,
                  }
                : {},
        ),
        cacheDirectory: withDefault(mixedInputConfig.cacheDirectory, cacheDirectory),
        cacheExpirationTime: withDefault(mixedInputConfig.cacheExpirationTime, 1000 * 60 * 60 * 24 * 30),
        displayIntermediateCalculations: withDefault(
            mixedInputConfig.displayIntermediateCalculations,
            !IS_CI_ENVIRONMENT,
        ),
        intermediateRefreshInterval: withDefault(mixedInputConfig.intermediateRefreshInterval, 10000),
        failOnSignificantChanges: withDefault(mixedInputConfig.failOnSignificantChanges, true),
        outputFilePath: withDefault(
            mixedInputConfig.outputFilePath,
            mode === 'collaborative' ? 'perftest/result.json' : 'perftest/report-[time].json',
        ),
        configPath: withDefault(mixedInputConfig.configPath, undefined),
        logLevel: withDefault(mixedInputConfig.logLevel, 'normal'),
        puppeteerOptions: withDefault(mixedInputConfig.puppeteerOptions, {}),
        taskWaitTimeout: withDefault(mixedInputConfig.taskWaitTimeout, 1000 * 10),
        runWaitTimeout: withDefault(mixedInputConfig.runWaitTimeout, 1000 * 60 * 2),
        dryRunTimes: withDefault(mixedInputConfig.dryRunTimes, 1),
        maxTimeoutsInRow: withDefault(mixedInputConfig.maxTimeoutsInRow, 3),
        modifyWebpackConfig: withDefault(mixedInputConfig.modifyWebpackConfig, (c) => c),
        exportPickRule: withDefault(mixedInputConfig.exportPickRule, 'named'),
        baselineRefDir: withDefault(mixedInputConfig.baselineRefDir, undefined),
        compareAtOnce: withDefault(mixedInputConfig.compareAtOnce, true),
        baselineOutputPath: withDefault(mixedInputConfig.baselineOutputPath, 'perftest/baseline.json'),
        compareOutputPath: withDefault(mixedInputConfig.compareOutputPath, 'perftest/comparison.json'),
        visualReportOutputPath: withDefault(mixedInputConfig.visualReportOutputPath, 'perftest/report.html'),
    };

    debug('final config: ', result);

    return result;
}

export function getClientConfig(config: Config): ClientConfig {
    return {
        tasks: config.tasks,
        taskConfiguration: config.taskConfiguration,
        metrics: config.metrics,
        metricConfiguration: config.metricConfiguration,
        logLevel: config.logLevel,
        taskWaitTimeout: config.taskWaitTimeout,
    };
}
