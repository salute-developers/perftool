import webpack, { Configuration as WebpackConfig } from 'webpack';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import process from 'process';
import fs from 'fs';

import { buildDirectory, Config, distDirectory, getWebpackConfig, sourceDirectory } from '../config';
import { debug, error, info, warn } from '../utils/logger';

import { TestModule } from './collect';
import { modifyEntrypoint } from './entrypoint';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// TODO memfs unionfs
function build(config: WebpackConfig) {
    info('Running Webpack...');

    return new Promise((resolve, reject) => {
        webpack(config, (err, stats) => {
            if (stats?.hasWarnings()) {
                for (const warning of stats?.compilation.warnings || []) {
                    warn(warning);
                }
            }

            if (err || stats?.hasErrors()) {
                for (const e of stats?.compilation.errors || []) {
                    // TODO better webpack logging
                    error(e);
                }
                reject(err || stats?.compilation.errors);
                return;
            }

            if (stats) {
                resolve(stats);
            }
        });
    });
}

async function copyModules(target: string) {
    const source = path.resolve(dirname, '../../src');

    debug('copying files from', source, 'to', target);

    const pathsToCopy = ['client', 'config', 'utils', 'stabilizers', 'clientEntry.ts'];

    debug('will copy', pathsToCopy);

    debug('removing', target);
    await fsPromises.rm(target, { force: true, recursive: true });

    debug('creating directory', target);
    await fsPromises.mkdir(target, { recursive: true });

    const cpReqs = pathsToCopy.map((p) => {
        debug('copying from', path.resolve(source, p), 'to', path.resolve(target, p));

        return fsPromises.cp(path.resolve(source, p), path.resolve(target, p), {
            recursive: true,
            filter(src) {
                return !/__spec__|webpack/.test(src);
            },
        });
    });

    await Promise.all(cpReqs);
    debug('files copied successfully');
}

type BuildClientParams = {
    config: Config;
    testModules: TestModule[];
};

// TODO memfs unionfs
const pathsToClean: string[] = [];

export async function buildClient({ config, testModules }: BuildClientParams) {
    info('Building client...');

    const entry = path.join(sourceDirectory, 'clientEntry.ts');
    debug('client entrypoint is ', entry);

    await copyModules(sourceDirectory);
    pathsToClean.push(distDirectory);

    await modifyEntrypoint({
        modules: testModules,
        entrypointPath: entry,
        config,
    });

    const webpackConfig = getWebpackConfig(entry, buildDirectory, config);

    await build(webpackConfig);

    info('Build successful');
}

// TODO memfs unionfs
process.on('exit', () => {
    for (const p of pathsToClean) {
        debug('cleaning up', p);
        fs.rmSync(p, { recursive: true, force: true });
    }
});
