import path from 'path';

import getHashCode from './hash';
import CWD from './cwd';

// kinda ok as query string value and variable name
export default function getSubjectId(modulePath: string, namedExport: string): string {
    return `${namedExport}_${getHashCode(path.relative(CWD, path.resolve(CWD, modulePath)))}`;
}
