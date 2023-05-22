import { RuleSetRule } from 'webpack';

import { babelOptions } from './babelOptions';

export function getTranspilerConfig(transpiler: string): RuleSetRule {
    if (transpiler === 'babel') {
        return {
            loader: require.resolve('babel-loader'),
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            options: babelOptions,
        };
    }
    // TODO: swc
    return {};
}
