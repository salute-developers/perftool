import webpack, { Configuration as WebpackConfig } from 'webpack';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

import { buildDirectory, Config, getWebpackConfig, sourceDirectory } from '../config';
import { debug, error, info, warn } from '../utils/logger';

import { TestModule } from './collect';
import { modifyEntrypoint } from './entrypoint';

const dirname = path.dirname(fileURLToPath(import.meta.url));

type BuildResult = {
    subjectsDepsHashMap: Map<string, string>;
};

// TODO memfs unionfs
function build(config: WebpackConfig): Promise<BuildResult> {
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

            resolve({
                subjectsDepsHashMap: new Map(
                    [...(stats?.compilation?.chunks || [])]
                        .filter((chunk) => chunk.name?.startsWith('subject~'))
                        .map((chunk) => [chunk.name!.replace('subject~', ''), chunk.contentHash.javascript]),
                ),
            });

            info('Build successful');
        });
    });
}

async function copyModules(config: Config) {
    const target = sourceDirectory;
    const source = path.resolve(dirname, '../../lib');

    debug('copying files from', source, 'to', target);

    const pathsToCopy = ['client', 'config', 'utils', 'stabilizers', 'clientEntry.ts'];

    if (config.mode === 'preview') {
        pathsToCopy.push('preview');
    }

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

export async function buildClient({ config, testModules }: BuildClientParams): Promise<BuildResult> {
    info('Building client...');

    const entry = path.join(sourceDirectory, 'clientEntry.ts');
    debug('client entrypoint is ', entry);

    await copyModules(config);

    await modifyEntrypoint({
        modules: testModules,
        entrypointPath: entry,
        config,
    });

    const webpackConfig = getWebpackConfig(entry, buildDirectory, config);

    return build(webpackConfig);
}
