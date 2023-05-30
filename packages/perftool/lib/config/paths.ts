import path from 'path';

import CWD from '../utils/cwd';

export const mainDirectory = path.resolve(CWD, './.perftool');

export const buildDirectory = path.resolve(mainDirectory, 'build');

export const sourceDirectory = path.resolve(mainDirectory, 'lib');

export const cacheDirectory = path.resolve(mainDirectory, 'cache');
