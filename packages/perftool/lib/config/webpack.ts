import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack, { Configuration as WebpackConfig } from 'webpack';
import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';

import { debug } from '../utils/logger';
import CWD from '../utils/cwd';

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
                loader: require.resolve('babel-loader'),
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                options: {
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

export function getWebpackConfig(entry: string, output: string, config: Config): WebpackConfig {
    const isPreviewMode = config.mode === 'preview';
    const env: Record<string, string> = {
        'process.env.PERFTOOL_CLIENT_RUNTIME': JSON.stringify(true),
        'process.env.PERFTOOL_PREVIEW_MODE': JSON.stringify(isPreviewMode),
    };

    const finalConfig = config.modifyWebpackConfig(defaultConfig);

    finalConfig.plugins!.push(new webpack.DefinePlugin(env));
    if (isPreviewMode) {
        finalConfig.mode = 'development';
    }

    finalConfig.entry = entry;
    finalConfig.output!.path = output;

    debug('final webpack config', JSON.stringify(finalConfig, null, 2));

    return finalConfig;
}
