import path from 'path';

import checkPath from '../utils/checkPath';
import { debug, error, info } from '../utils/logger';
import CWD from '../utils/cwd';

import { ProjectConfig } from './common';

const defaultJsConfigPath = path.resolve(CWD, './perftool.config.mjs');
const defaultTsConfigPath = path.resolve(CWD, './perftool.config.mts');

type ImportedConfig = {
    path: string;
    value: ProjectConfig;
};

export async function importConfig(cliConfigPath?: string): Promise<ImportedConfig | null> {
    debug('importing project config');
    let configPath = cliConfigPath ? path.resolve(CWD, cliConfigPath) : undefined;
    debug('cli config path is ', configPath);

    if (configPath && !(await checkPath(configPath))) {
        error('provided config path is inaccessible');
        throw new Error();
    }

    if (!configPath && (await checkPath(defaultJsConfigPath))) {
        debug('no provided config path, using default ', defaultJsConfigPath);
        configPath = defaultJsConfigPath;
    }

    if (!configPath && (await checkPath(defaultTsConfigPath))) {
        debug('no provided config path, using default ', defaultTsConfigPath);
        configPath = defaultTsConfigPath;
    }

    if (!configPath) {
        debug('no project config found, using default config');
        return null;
    }

    info('Using project config', configPath);

    const { default: value } = await import(configPath);

    debug('import succeeded, project config:', value);

    return {
        value,
        path: configPath,
    };
}
