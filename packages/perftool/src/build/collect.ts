import { readFile } from 'fs/promises';
import fg from 'fast-glob';
import { parse } from '@babel/parser';
import * as _traverse from '@babel/traverse';

import getSubjectId from '../utils/subjectId';
import checkPath from '../utils/checkPath';
import { Config } from '../config';
import { debug, info, warn } from '../utils/logger';

export type ExportPickRule = 'named'; // | 'default' | 'all'
const traverse = (_traverse.default as unknown as typeof _traverse).default;

export type TestSubject = {
    id: string;
    originalExportedName: string;
};

export type TestModule = {
    path: string;
    subjects: TestSubject[];
};

function getAst(content: string) {
    const data = parse(content, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'objectRestSpread',
            'classProperties',
            'optionalCatchBinding',
            'asyncGenerators',
            'decorators-legacy',
            'flow',
            'dynamicImport',
            'estree',
        ],
    });

    return data;
}
function getExportsName(ast: any) {
    const exports: any[] = [];
    traverse(ast, {
        ExportNamedDeclaration(path: any) {
            if (path.node.declaration) {
                exports.push(path.node.declaration.id?.name || '');
            } else {
                path.node.specifiers.array.forEach((specifier: any) => {
                    exports.push(specifier.exported.name);
                });
            }
        },
    });
    return exports;
}

const PICK_RULE_METHODS: Record<ExportPickRule, (fileContents: string) => string[]> = {
    named(fileContents) {
        debug(fileContents);
        const ast = getAst(fileContents);
        const exportsName = getExportsName(ast);
        return exportsName.map(([, name]) => name);
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
    debug('parsing modules... ');

    const modulesPromise = Promise.all(paths.map((path) => getTestModule(path, config.exportPickRule)));

    const result = (await modulesPromise).filter((module): module is TestModule => Boolean(module));

    debug('all modules parsed successfully. found test subjects: ', result);

    return result;
}
