import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack, { Configuration as WebpackConfig } from 'webpack';
import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';

import { debug } from '../utils/logger';

// import { getTranspilerConfig } from './transpiler';
import { Config } from './common';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const ownNodeModules = path.relative(process.cwd(), path.resolve(dirname, '../../node_modules'));

const defaultConfig: WebpackConfig = {
    mode: 'production',
    externals: ['fsevents'],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
        modules: ['node_modules', ownNodeModules],
        fallback: {
            'react-dom/client': false,
        },
    },
    experiments: {
        topLevelAwait: true,
    },
    performance: {
        hints: false,
        maxAssetSize: 1024 * 1024,
        maxEntrypointSize: 1024 * 1024,
    },
    output: {
        filename: 'bundle.[chunkhash].js',
    },
    module: {
        rules: [
            {
                loader: 'url-loader',
                test: /\.(jpg|jpeg|ico|webp|jp2|avif|png|gif|woff|eot|ttf|svg)$/,
                options: {
                    limit: 100000,
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin(),
        new webpack.DefinePlugin({
            'process.env.PERFTOOL_CLIENT_RUNTIME': JSON.stringify(true),
        }),
    ],
};

export function getWebpackConfig(entry: string, output: string, config: Config): WebpackConfig {
    debug('creating webpack config');

    const finalConfig = config.modifyWebpackConfig(defaultConfig);

    if (config.transpiler !== 'none') {
        // const transpiler = getTranspilerConfig(config); // пока что не похватывает настройки для babel
        finalConfig.module?.rules?.push({
            loader: require.resolve('babel-loader'),
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            options: {
                sourceType: 'module',
                presets: [
                    ['@babel/preset-env', { targets: { chrome: '90', esmodules: true } }],
                    '@babel/preset-react',
                    '@babel/preset-typescript',
                ],
                plugins: [],
            },
        });
    }

    finalConfig.entry = entry;
    finalConfig.output!.path = output;

    debug('final webpack config', JSON.stringify(finalConfig, null, 2));

    return finalConfig;
}
