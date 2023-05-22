import path from 'path';

import CWD from '../utils/cwd';

export { getConfig } from './common';
export type { Config, ProjectConfig } from './common';

export { getTaskConfig, getAllTasks } from './task';

export { getWebpackConfig } from './webpack';

export const distDirectory = path.resolve(CWD, './perftoolTmpDist');

export const buildDirectory = path.resolve(distDirectory, 'build');

export const sourceDirectory = path.resolve(distDirectory, 'lib');
