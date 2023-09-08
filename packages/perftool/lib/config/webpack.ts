import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack, { Configuration as WebpackConfig } from 'webpack';
import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';

import { debug } from '../utils/logger';
import CWD from '../utils/cwd';
import { getSubjectIdToReadableNameMap } from '../utils/subjectId';
import type { TestModule } from '../build/collect';

import { Config } from './common';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const ownNodeModules = path.relative(CWD, path.resolve(dirname, '../../node_modules'));
const ownNodeModulesPnpmTreatment = path.relative(CWD, path.resolve(dirname, '../../../..'));

const defaultConfig: WebpackConfig = {
    mode: 'production',
    context: CWD,
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
        modules: ['node_modules', ownNodeModules, ownNodeModulesPnpmTreatment],
        fallback: {
            'react-dom/client': false,
        },
    },
    performance: {
        hints: false,
        maxAssetSize: 1024 * 1024,
        maxEntrypointSize: 1024 * 1024,
    },
    output: {},
    module: {
        rules: [
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                loader: require.resolve('babel-loader'),
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                options: {
                    cwd: CWD,
                    presets: [
                        ['@babel/preset-env', { targets: { chrome: '90', esmodules: true } }],
                        '@babel/preset-react',
                        '@babel/preset-typescript',
                    ],
                    plugins: [],
                },
            },
        ],
    },
    plugins: [new HtmlWebpackPlugin()],
    optimization: {
        splitChunks: false,
        mergeDuplicateChunks: false,
        usedExports: true,
    },
};

type GetWebpackConfigParams = {
    entry: string;
    output: string;
    config: Config;
    testModules: TestModule[];
};

export function getWebpackConfig({ entry, output, config, testModules }: GetWebpackConfigParams): WebpackConfig {
    const isPreviewMode = config.mode === 'preview';
    const env: Record<string, string> = {
        'process.env.PERFTOOL_CLIENT_RUNTIME': JSON.stringify(true),
        'process.env.PERFTOOL_PREVIEW_MODE': JSON.stringify(isPreviewMode),
    };

    const finalConfig = config.modifyWebpackConfig(defaultConfig);
    const readableNames = getSubjectIdToReadableNameMap(testModules);

    if (isPreviewMode) {
        env['process.env.PERFTOOL_PREVIEW_READABLE_NAMES'] = JSON.stringify(readableNames);
        finalConfig.mode = 'development';
    }

    finalConfig.plugins!.push(new webpack.DefinePlugin(env));

    finalConfig.entry = entry;
    finalConfig.output!.path = output;

    debug('final webpack config', JSON.stringify(finalConfig, null, 2));

    return finalConfig;
}
