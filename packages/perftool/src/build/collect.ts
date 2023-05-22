import { readFile } from 'fs/promises';
import fg from 'fast-glob';

import getSubjectId from '../utils/subjectId';
import checkPath from '../utils/checkPath';
import { Config } from '../config';
import { debug, info, warn } from '../utils/logger';
import { getAst } from '../utils/ast';
import traverse from '../utils/traverseExport';

export type ExportPickRule = 'named'; // | 'default' | 'all'

export type TestSubject = {
    id: string;
    originalExportedName: string;
};

export type TestModule = {
    path: string;
    subjects: TestSubject[];
};

const PICK_RULE_METHODS: Record<ExportPickRule, (fileContents: string) => string[]> = {
    named(fileContents) {
        const exports: string[] = [];
        const ast = getAst(fileContents);

        if (!ast) {
            return exports;
        }

        traverse(ast, {
            ExportNamedDeclaration(path: any) {
                if (path.node.declaration) {
                    exports.push(path.node.declaration.id?.name);
                } else {
                    path.node.specifiers.array.forEach((specifier: any) => {
                        exports.push(specifier.exported.name);
                    });
                }
            },
        });
        return exports;
    },
};

function getExports(fileContents: string, exportPickRule: ExportPickRule): string[] {
    const method = PICK_RULE_METHODS[exportPickRule];
    return method(fileContents);
}

async function getTestModule(path: string, exportPickRule: ExportPickRule): Promise<TestModule | null> {
    debug('getting test subjects from module ', path);
    debug('export pick rule is ', exportPickRule);

    const isModuleAvailable = await checkPath(path);

    if (!isModuleAvailable) {
        warn('module ', path, ' is not available, skipping');
        return null;
    }

    const contents = await readFile(path, { encoding: 'utf8' });
    const exports = getExports(contents, exportPickRule);

    if (!exports.length) {
        warn('module ', path, 'has no suitable exports, skipping');
        return null;
    }

    debug('found exports ', exports);

    const subjects = exports.map((originalExportedName) => ({
        id: getSubjectId(path, originalExportedName),
        originalExportedName,
    }));

    return {
        path,
        subjects,
    };
}

export default async function collectTestSubjects(config: Config): Promise<TestModule[]> {
    info('Collecting test subjects...');
    debug('include: ', config.include, 'exclude: ', config.exclude);

    const paths = await fg(config.include, { ignore: config.exclude });

    debug('found modules: ', paths);

    if (!paths.length) {
        info('Component test will not run because no exports names were found');
        return [];
    }

    debug('parsing modules... ');

    const modulesPromise = Promise.all(paths.map((path) => getTestModule(path, config.exportPickRule)));

    const result = (await modulesPromise).filter((module): module is TestModule => Boolean(module));

    debug('all modules parsed successfully. found test subjects: ', result);

    return result;
}
