import process from 'process';
import { createArgument, createCommand, createOption, OptionValues } from 'commander';

import { getConfig, getAllTasks, Config } from '../config';
import { importConfig } from '../config/node';
import collectTestSubjects, { TestModule } from '../build/collect';
import { buildClient } from '../build';
import { createServer } from '../server';
import { runTests } from '../controller';
import Statistics from '../statistics';
import {
    formatFilename,
    generateReport,
    getReport,
    measureStartingPoint,
    displayReport,
    writeReport,
} from '../reporter';
import { CliConfig } from '../config/common';
import { debug, error, info, pushPrefix, setLogLevel } from '../utils/logger';
import getCurrentVersion from '../utils/version';
import Cache from '../cache';
import { filterBaselineTestModules, filterTestModulesByCachedDepsHash } from '../utils/subjectDeps';
import PreviewController from '../preview/controller';
import { processCliLogLevel, processPerftoolMode } from '../utils/cli';
import { createChild, sendClientBuilt, sendServerCreated, sendTestModules } from '../utils/ipc';
import { processReports } from '../compare/process';
import { makeVisualReport } from '../reporter/htmlReporter';

const cli = createCommand('perftool');

cli.addArgument(createArgument('[include...]', 'Modules to run perftest on'))
    .addOption(createOption('-c, --configPath <path>', 'Config path'))
    .addOption(createOption('-b, --baseBranchRef <ref>', 'Base branch ref'))
    .addOption(createOption('-С, --currentBranchRef <ref>', 'Current branch ref'))
    .addOption(createOption('-o, --outputFilePath <path>', 'Output file path'))
    .addOption(createOption('--baselineOutputPath <path>', 'Baseline output file path'))
    .addOption(createOption('--compareOutputPath <path>', 'Comparison output file path'))
    .addOption(createOption('-V, --visualReportPath <path>', 'Visual report path'))
    .addOption(
        createOption('-B, --baselineRefDir <path>', 'Path to baseline version of the project (collaborative mode)'),
    )
    .addOption(createOption('-l, --logLevel <level>', 'Log level').choices(['quiet', 'normal', 'verbose']))
    .addOption(createOption('-v, --verbose', 'Log level verbose'))
    .addOption(createOption('-q, --quiet', 'Log level quiet'))
    .addOption(createOption('-p, --preview', 'Preview mode'));

function getCliConfig(include: string[], rawOptions: OptionValues): CliConfig {
    const { preview, verbose, quiet, logLevel, baselineRefDir, visualReportPath, ...options } = rawOptions;
    const mode = processPerftoolMode({ preview, baselineRefDir });

    return {
        include,
        logLevel: processCliLogLevel({ verbose, quiet, logLevel }),
        visualReportOutputPath: visualReportPath,
        mode,
        baselineRefDir,
        ...options,
    };
}

async function start() {
    info(`Perftool v.${await getCurrentVersion()}`);

    await cli.parseAsync();
    const options = cli.opts();
    const [include] = cli.processedArgs;
    const cliConfig: CliConfig = getCliConfig(include, options || {});

    setLogLevel(cliConfig.logLevel);

    debug('parsed cli config', cliConfig);

    const importedConfig = await importConfig(cliConfig.configPath);
    const config = getConfig(cliConfig, importedConfig?.value);

    const testModules = await collectTestSubjects(config);

    if (!testModules.length) {
        info('No test modules found, exiting');

        if (config.mode === 'child') {
            sendTestModules([]);
        }

        return;
    }

    switch (config.mode) {
        case 'normal':
            return processNormalMode(config, testModules);
        case 'preview':
            return processPreviewMode(config, testModules);
        case 'collaborative':
            return processCollaborativeMode(config, testModules);
        case 'child':
            return processChildMode(config, testModules);
        default:
            throw new Error();
    }
}

async function processPreviewMode(config: Config, testModules: TestModule[]) {
    info('Running in preview mode');

    await buildClient({ config, testModules });
    const { port, stop } = await createServer(config);

    const previewController = await PreviewController.create(port);
    await previewController.start();

    await previewController.finalize();
    await stop();
}

async function processNormalMode(config: Config, testModules: TestModule[]) {
    const cache = await Cache.acquire(config);
    const tasks = getAllTasks(config);
    info(
        'Tasks performed in this run: ',
        tasks.map((t) => t.id),
    );

    const { subjectsDepsHashMap } = await buildClient({ config, testModules });

    debug('Deps mapping', subjectsDepsHashMap);

    const filteredTestModulesByDepsCache = filterTestModulesByCachedDepsHash({
        config,
        cache,
        subjectsDepsHashMap,
        testModules,
    });

    if (!filteredTestModulesByDepsCache.length) {
        info('No changed modules found, exiting');

        await generateReport({
            config,
            data: {},
            testModules,
            actualTestModules: filteredTestModulesByDepsCache,
        });
        return;
    }

    const { port, stop } = await createServer(config);

    measureStartingPoint();

    const testResultsStream = runTests({
        cache,
        config,
        port,
        tasks,
        testModules: filteredTestModulesByDepsCache,
    });

    const stats = new Statistics(config, tasks);
    const consumingPromise = stats.consume(testResultsStream);

    if (config.displayIntermediateCalculations) {
        await displayReport(stats.stream());
    } else {
        await consumingPromise;
    }

    cache.setSubjectsDepsHash(subjectsDepsHashMap);
    await cache.save();
    await stop();

    await generateReport({
        config,
        data: stats.getResult(),
        testModules,
        actualTestModules: filteredTestModulesByDepsCache,
    });
}

async function processCollaborativeMode(config: Config, testModules: TestModule[]) {
    pushPrefix('[main]');

    const child = createChild({ config });
    const tasks = getAllTasks(config);

    info(
        'Tasks performed in this run: ',
        tasks.map((t) => t.id),
    );

    const { subjectsDepsHashMap } = await buildClient({ config, testModules });
    const { port, stop } = await createServer(config);

    debug('Deps mapping', subjectsDepsHashMap);

    const baselineTestModules = await child.testSubjectsCollectedPromise;
    const baselineSubjectsDeps = (await child.clientBuiltPromise).subjectsDepsHashMap;

    debug('Baseline deps mapping', baselineSubjectsDeps);

    const cache = await Cache.acquire(config);
    const filteredTestModules = filterTestModulesByCachedDepsHash({
        config,
        cache,
        subjectsDepsHashMap,
        testModules,
        baselineTestModules,
        baselineSubjectsDeps,
    });

    const filteredBaselineTestModules = filterBaselineTestModules({
        testModules: filteredTestModules,
        baselineTestModules,
    });
    const baselineServer = await child.serverCreatedPromise;
    measureStartingPoint();

    const testResultsStream = runTests({
        cache,
        config,
        port,
        tasks,
        testModules: filteredTestModules,

        baselinePort: baselineServer.port,
        baselineTestModules: filteredBaselineTestModules,
    });

    const testResults = [];

    for await (const res of testResultsStream) {
        testResults.push(res);
    }

    const stats = new Statistics(config, tasks);
    const baselineStats = new Statistics(config, tasks);

    stats.addObservations(testResults.filter((res) => !res.isBaseline));
    baselineStats.addObservations(testResults.filter((res) => res.isBaseline));

    cache.setSubjectsDepsHash(new Map());
    await cache.save();
    await stop();
    baselineServer.stop();
    child.shutdown();

    const currentReport = await getReport({
        config,
        data: stats.getResult(),
        testModules,
        actualTestModules: filteredTestModules,
    });
    const previousReport = await getReport({
        config,
        data: baselineStats.getResult(),
        testModules: baselineTestModules,
        actualTestModules: filteredBaselineTestModules,
    });

    const writeReqs = [
        writeReport(currentReport, formatFilename(config.outputFilePath)),
        writeReport(previousReport, formatFilename(config.baselineOutputPath)),
    ];

    if (config.compareAtOnce) {
        const comparisonReport = await processReports(config, currentReport, previousReport);
        writeReqs.push(writeReport(comparisonReport, formatFilename(config.compareOutputPath)));
        writeReqs.push(makeVisualReport({ config, currentReport, previousReport, comparisonReport }));

        await Promise.all(writeReqs);

        if (config.failOnSignificantChanges && comparisonReport.hasSignificantNegativeChanges) {
            throw new Error('Looks like something changed badly');
        }
    }

    await Promise.all(writeReqs);
}

async function processChildMode(config: Config, testModules: TestModule[]) {
    pushPrefix('[baseline]');

    sendTestModules(testModules);

    const { subjectsDepsHashMap } = await buildClient({ config, testModules });
    sendClientBuilt(subjectsDepsHashMap);

    const { port, stop } = await createServer(config);
    await sendServerCreated({ port, stop });
}

await start()
    .then(() => process.exit())
    .catch((err: Error) => {
        error(err.message, err.stack);
        process.exit(1);
    });
