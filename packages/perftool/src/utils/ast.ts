import * as babelCore from '@babel/core';
import { File } from '@babel/types';

import { info } from '../utils/logger';
import { babelOptions } from '../config/babelOptions';

export function getAst(fileContents: string): File | null {
    try {
        const ast = babelCore.parseSync(fileContents, {
            filename: 'file.tsx',
            ...babelOptions,
        });
        return ast as File;
    } catch (error) {
        info('Ошибка при получении AST:', error);
        return null;
    }
}
