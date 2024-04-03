import process from 'process';
import fsPromises from 'fs/promises';
import path from 'path';
import { createCommand, createArgument, createOption, OptionValues } from 'commander';

import { getConfig } from '../config';
import { debug, error, info, setLogLevel } from '../utils/logger';
import { importConfig } from '../config/node';
import CWD from '../utils/cwd';
import { processReports } from '../compare/process';
import { CliConfig } from '../config/common';
import { processCliLogLevel } from '../utils/cli';
import { writeReport } from '../reporter';
import { makeVisualReport } from '../reporter/htmlReporter';

const cli = createCommand('perftool-compare');

cli.addArgument(createArgument('<current>', 'Fresh perftool generated report'))
    .addArgument(createArgument('<previous>', 'Older report to compare with')) // TODO rest, support url
    .addOption(createOption('-F, --failOnSignificantChanges', 'Fail on significant negative changes'))
    .addOption(createOption('-c, --configPath <path>', 'Config path'))
    .addOption(createOption('-o, --outputFilePath <path>', 'Output file path'))
    .addOption(createOption('-V, --visualReportPath <path>', 'Visual report path'))
    .addOption(createOption('-l, --logLevel <level>', 'Log level').choices(['quiet', 'normal', 'verbose']))
    .addOption(createOption('-v, --verbose', 'Log level verbose'))
    .addOption(createOption('-q, --quiet', 'Log level quiet'));

function getCliConfig(rawOptions: OptionValues): CliConfig {
    const { verbose, quiet, logLevel, visualReportPath, ...options } = rawOptions;

    return {
        logLevel: processCliLogLevel({ verbose, quiet, logLevel }),
        visualReportOutputPath: visualReportPath,
        ...options,
    };
}

async function start() {
    await cli.parseAsync();

    const options = cli.opts();
    const cliConfig: CliConfig = getCliConfig(options || {});

    setLogLevel(cliConfig.logLevel);

    debug('cli config', cliConfig);

    const importedConfig = await importConfig(cliConfig?.configPath);
    const config = getConfig(cliConfig, importedConfig?.value);

    info('Comparing runs...');
    const outputPath = path.resolve(CWD, cli.opts().outputFilePath || './perftest/comparison.json');
    const [current, previous] = cli.processedArgs;

    const [currentReport, previousReport] = await Promise.all([
        fsPromises.readFile(path.resolve(CWD, current), { encoding: 'utf-8' }).then(JSON.parse),
        fsPromises.readFile(path.resolve(CWD, previous), { encoding: 'utf-8' }).then(JSON.parse),
    ]);

    const comparisonReport = await processReports(config, currentReport, previousReport);

    const writeReqs = [
        writeReport(comparisonReport, outputPath),
        makeVisualReport({ config, currentReport, previousReport, comparisonReport }),
    ];

    await Promise.all(writeReqs);

    info('Report successfully written to', outputPath);

    if (config.failOnSignificantChanges && comparisonReport.hasSignificantNegativeChanges) {
        throw new Error('Looks like something changed badly');
    }
}

await start()
    .then(() => process.exit())
    .catch((err: Error) => {
        error(err.name, err.message, err.stack);
        process.exit(1);
    });
