import fsPromises from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

import { formatLines } from '../utils/codegen';
import { Config } from '../config';
import { debug } from '../utils/logger';
import CWD from '../utils/cwd';

import { TestModule } from './collect';

function getModuleRelativePath(modulePath: string, importedModulePath: string): string {
    const moduleDir = path.dirname(modulePath);
    const relativePath = path.relative(moduleDir, path.resolve(CWD, importedModulePath));

    return relativePath.replace(path.extname(importedModulePath), '');
}

type ModifyEntrypointParams = {
    modules: TestModule[];
    entrypointPath: string;
    config: Config;
};

export async function modifyEntrypoint({ modules, entrypointPath, config }: ModifyEntrypointParams): Promise<void> {
    debug('modifying entrypoint', entrypointPath);

    const clientTestSubjects = modules
        .map(({ subjects, path: modulePath }) => {
            return subjects.map(
                ({ id, originalExportedName }) => `{ id: '${id}', loadComponent: async () => (await import(
    /* webpackMode: "lazy" */
    /* webpackChunkName: "subject~${id}" */
    /* webpackExports: ["${originalExportedName}"] */
    '${getModuleRelativePath(entrypointPath, modulePath)}'))['${originalExportedName}'] },`,
            );
        })
        .flat();

    debug('entry test subjects', clientTestSubjects);

    debug('reading initial contents of entry');
    const contents = await fsPromises.readFile(entrypointPath, { encoding: 'utf-8' });
    debug('reading initial contents of entry succeed');

    const formattedContents = contents
        // Insert generated code that creates subjects into entrypoint
        .replace('// <TEST_SUBJECT_MARK>', formatLines(clientTestSubjects))
        // Insert serialized config
        .replace('// <CONFIG_ARGS_MARK>', JSON.stringify(config));

    debug('writing modified contents');
    await fsPromises.writeFile(entrypointPath, formattedContents, { encoding: 'utf-8', mode: constants.O_TRUNC });
    debug('writing modified contents succeed');
}
