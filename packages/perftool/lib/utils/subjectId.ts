import path from 'path';

import type { TestModule } from '../build/collect';

import getHashCode from './hash';
import CWD from './cwd';

// kinda ok as query string value and variable name
export default function getSubjectId(modulePath: string, namedExport: string): string {
    return `${namedExport}_${getHashCode(path.relative(CWD, path.resolve(CWD, modulePath)))}`;
}

export function getSubjectIdToReadableNameMap(testModules: TestModule[]) {
    return testModules.reduce(
        (acc, { subjects, path: modulePath }) => {
            subjects.forEach(({ id, originalExportedName }) => {
                acc[id] = `${path.relative(CWD, path.resolve(CWD, modulePath))}#${originalExportedName}`;
            });

            return acc;
        },
        {} as { [k: string]: string },
    );
}
