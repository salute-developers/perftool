import { readFile } from 'fs/promises';
import fg from 'fast-glob';
import path from 'path';

import getSubjectId from '../utils/subjectId';
import checkPath from '../utils/checkPath';
import { Config } from '../config';
import { debug, info, warn } from '../utils/logger';
import CWD from '../utils/cwd';

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
        const regex = /export\s+(?:const|var|let|function)\s+?([\w$_][\w\d$_]*)/g;
        const matches = [...fileContents.matchAll(regex)];

        return matches.map(([, name]) => name);
    },
};

function getExports(fileContents: string, exportPickRule: ExportPickRule): string[] {
    const method = PICK_RULE_METHODS[exportPickRule];
    return method(fileContents);
}

async function getTestModule(modulePath: string, exportPickRule: ExportPickRule): Promise<TestModule | null> {
    const moduleAbsolutePath = path.resolve(CWD, modulePath);
    debug('getting test subjects from module ', modulePath);
    debug('export pick rule is ', exportPickRule);

    const isModuleAvailable = await checkPath(moduleAbsolutePath);

    if (!isModuleAvailable) {
        warn('module ', moduleAbsolutePath, ' is not available, skipping');
        return null;
    }

    const contents = await readFile(moduleAbsolutePath, { encoding: 'utf8' });
    const exports = getExports(contents, exportPickRule);

    if (!exports.length) {
        warn('module ', moduleAbsolutePath, 'has no suitable exports, skipping');
        return null;
    }

    debug('found exports ', exports);

    const subjects = exports.map((originalExportedName) => ({
        id: getSubjectId(modulePath, originalExportedName),
        originalExportedName,
    }));

    return {
        path: modulePath,
        subjects,
    };
}

export default async function collectTestSubjects(config: Config): Promise<TestModule[]> {
    info('Collecting test subjects...');
    debug('include: ', config.include, 'exclude: ', config.exclude);

    const paths = await fg(config.include, { ignore: config.exclude, cwd: CWD });

    debug('found modules: ', paths);
    debug('parsing modules... ');

    const modulesPromise = Promise.all(paths.map((path) => getTestModule(path, config.exportPickRule)));

    const result = (await modulesPromise).filter((module): module is TestModule => Boolean(module));

    debug('all modules parsed successfully. found test subjects: ', result);

    return result;
}
