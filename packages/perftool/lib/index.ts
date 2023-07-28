import process from 'process';
import { createArgument, createCommand, createOption, OptionValues } from 'commander';

import { getConfig, getAllTasks, ProjectConfig } from './config';
import { importConfig } from './config/node';
import collectTestSubjects from './build/collect';
import { buildClient } from './build';
import { createServer } from './server';
import { runTests } from './controller';
import Statistics from './statistics';
import { generateReport, measureStartingPoint, report } from './reporter';
import { CliConfig } from './config/common';
import { debug, error, info, setLogLevel } from './utils/logger';
import getCurrentVersion from './utils/version';
import Cache from './cache';
import openBrowser from './utils/openBrowser';
import { waitForSigint } from './utils/interrupt';

export { intercept } from './api/external';
export type { ProjectConfig as Config };

const cli = createCommand('perftool');

cli.addArgument(createArgument('[include...]', 'Modules to run perftest on'))
    .addOption(createOption('-l, --logLevel <level>', 'Log level').choices(['quiet', 'normal', 'verbose']))
    .addOption(createOption('-c, --configPath <path>', 'Config path'))
    .addOption(createOption('-b, --baseBranchRef <ref>', 'Base branch ref'))
    .addOption(createOption('-С, --currentBranchRef <ref>', 'Current branch ref'))
    .addOption(createOption('-p, --preview', 'Preview mode'))
    .addOption(createOption('-o, --outputFilePath <path>', 'Output file path'));

function getCliConfig(include: string[], rawOptions: OptionValues): CliConfig {
    const { preview, ...options } = rawOptions;
    const mode = preview ? 'preview' : undefined;

    return {
        include,
        mode,
        ...options,
    };
}

async function start() {
    info(`Perftool v.${await getCurrentVersion()}`);

    await cli.parseAsync();
    const options = cli.opts();

    setLogLevel(options.logLevel);

    const [include] = cli.processedArgs;
    const cliConfig: CliConfig = getCliConfig(include, options || {});
    debug('parsed cli config', cliConfig);

    const importedConfig = await importConfig(cliConfig.configPath);
    const config = getConfig(cliConfig, importedConfig?.value);
    const cache = await Cache.acquire(config);

    const testModules = await collectTestSubjects(config);

    if (!testModules.length) {
        info('No test modules found, exiting');
        return;
    }

    const tasks = getAllTasks(config);

    if (config.mode === 'preview') {
        info('Running in preview mode');
    } else {
        info(
            'Tasks performed in this run: ',
            tasks.map((t) => t.id),
        );
    }

    await buildClient({ config, testModules });

    const { port, stop } = await createServer(config);

    if (config.mode === 'preview') {
        await openBrowser({ port });
        await waitForSigint();
        await stop();

        return;
    }

    measureStartingPoint();

    const testResultsStream = runTests({ cache, config, port, tasks, testModules });

    const stats = new Statistics(config, tasks);
    const consumingPromise = stats.consume(testResultsStream);

    if (config.displayIntermediateCalculations) {
        await report(stats.stream());
    } else {
        await consumingPromise;
    }

    await cache.save();
    await stop();

    await generateReport(config, stats.getResult(), testModules);
}

await start()
    .then(() => process.exit())
    .catch((err: Error) => {
        error(err.name, err.message, err.stack);
        process.exit(1);
    });
