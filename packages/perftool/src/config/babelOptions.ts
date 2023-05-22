import * as babelCore from '@babel/core';

export const babelOptions: babelCore.TransformOptions = {
    sourceType: 'module',
    presets: [
        ['@babel/preset-env', { targets: { chrome: '90', esmodules: true } }],
        '@babel/preset-react',
        '@babel/preset-typescript',
    ],
    plugins: [],
};
