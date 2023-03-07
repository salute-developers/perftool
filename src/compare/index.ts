#!/usr/bin/env -S node --experimental-specifier-resolution=node --loader ts-node/esm
import process from 'process';
import fsPromises from 'fs/promises';
import path from 'path';
import { createCommand, createArgument, createOption } from 'commander';

import { getConfig } from '../config';
import { debug, error, info, setLogLevel } from '../utils/logger';
import { importConfig } from '../config/node';

import { processReports } from './process';

const cli = createCommand('perftool-compare');

cli.addArgument(createArgument('<current>', 'Fresh perftool generated report'))
    .addArgument(createArgument('<previous>', 'Older report to compare with')) // TODO rest, support url
    .addOption(createOption('-F, --failOnSignificantChanges', 'Fail on significant negative changes'))
    .addOption(createOption('-l, --logLevel <level>', 'Log level').choices(['quiet', 'normal', 'verbose']))
    .addOption(createOption('-c, --configPath <path>', 'Config path'))
    .addOption(createOption('-o, --outputFilePath <path>', 'Output file path'));

async function start() {
    await cli.parseAsync();

    const options = cli.opts();

    setLogLevel(options.logLevel);

    debug('cli config', options);

    const importedConfig = await importConfig(options?.configPath);
    const config = getConfig(options, importedConfig?.value);

    info('Comparing runs...');
    const outputPath = path.resolve(cli.opts().outputFilePath || './perftest/comparison.json');
    const [current, previous] = cli.processedArgs;

    const [currentReport, previousReport] = await Promise.all([
        fsPromises.readFile(path.resolve(current), { encoding: 'utf-8' }).then(JSON.parse),
        fsPromises.readFile(path.resolve(previous), { encoding: 'utf-8' }).then(JSON.parse),
    ]);

    const result = await processReports(config, currentReport, previousReport);
    const contents = JSON.stringify(result, null, 2);

    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
    await fsPromises.writeFile(outputPath, contents, {
        encoding: 'utf-8',
    });

    info('Report successfully written to', outputPath);

    if (config.failOnSignificantChanges && result.hasSignificantNegativeChanges) {
        throw new Error('Looks like something changed badly');
    }
}

await start()
    .then(() => process.exit())
    .catch((err: Error) => {
        error(err.name, err.message, err.stack);
        process.exit(1);
    });
