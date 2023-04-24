import fsPromises from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

import { formatImportExpression, formatLines } from '../utils/codegen';
import { Config } from '../config';
import { debug } from '../utils/logger';

import { TestModule } from './collect';

function getModuleRelativePath(modulePath: string, importedModulePath: string): string {
    const moduleDir = path.join(modulePath, '..');
    const relativePath = path.relative(moduleDir, importedModulePath);

    return relativePath.replace(path.extname(importedModulePath), '');
}

type ModifyEntrypointParams = {
    modules: TestModule[];
    entrypointPath: string;
    config: Config;
};

export async function modifyEntrypoint({ modules, entrypointPath, config }: ModifyEntrypointParams): Promise<void> {
    debug('modifying entrypoint', entrypointPath);

    debug('adding imports for modules', modules);
    const imports = modules.map((module) =>
        formatImportExpression(getModuleRelativePath(entrypointPath, module.path), {
            namedImports: module.subjects.map(({ id: alias, originalExportedName: original }) => ({
                original,
                alias,
            })),
        }),
    );

    debug('entry imports', imports);

    const clientTestSubjects = modules
        .map(({ subjects }) => {
            return subjects.map(({ id }) => `{ id: '${id}', Component: ${id} },`);
        })
        .flat();

    debug('entry test subjects', clientTestSubjects);

    debug('reading initial contents of entry');
    const contents = await fsPromises.readFile(entrypointPath, { encoding: 'utf-8' });
    debug('reading initial contents of entry succeed');

    // TODO comments
    const formattedContents = contents
        .replace('// <IMPORT_MARK>', formatLines(imports))
        .replace('// <TEST_SUBJECT_MARK>', formatLines(clientTestSubjects))
        .replace('// <CONFIG_ARGS_MARK>', JSON.stringify(config));

    debug('writing modified contents');
    await fsPromises.writeFile(entrypointPath, formattedContents, { encoding: 'utf-8', mode: constants.O_TRUNC });
    debug('writing modified contents succeed');
}
