import webpack, { Configuration as WebpackConfig } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';
import fsPromises from 'fs/promises';

import { ReportWithMeta } from '../index';
import { CompareReport } from '../../compare/process';
import { Config } from '../../config';
import CWD from '../../utils/cwd';
import { visualReportDirectory } from '../../config/paths';
import { build } from '../../build';
import { info } from '../../utils/logger';
import { getClientConfig } from '../../config/common';

type BuildVisualReportParams = {
    config: Config;
    currentReport: ReportWithMeta;
    previousReport?: ReportWithMeta;
    comparisonReport?: CompareReport;
};

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const ownNodeModules = path.relative(CWD, path.resolve(dirname, '../../node_modules'));
const entry = path.resolve(dirname, 'entry.tsx');

export async function makeVisualReport({
    config,
    currentReport,
    previousReport,
    comparisonReport,
}: BuildVisualReportParams): Promise<void> {
    info('Building visual report');

    const { visualReportOutputPath } = config;
    const filename = 'report.html';
    const webpackConfig: WebpackConfig = {
        mode: 'production',
        context: CWD,
        entry,
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
            modules: ['node_modules', ownNodeModules],
        },
        output: {
            path: visualReportDirectory,
        },
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
                    options: {
                        cwd: CWD,
                        presets: [
                            ['@babel/preset-env', { targets: { chrome: '90', esmodules: true } }],
                            '@babel/preset-react',
                            '@babel/preset-typescript',
                        ],
                    },
                },
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.PERFTOOL_REPORT_CURRENT': JSON.stringify(currentReport),
                'process.env.PERFTOOL_REPORT_PREVIOUS': JSON.stringify(previousReport),
                'process.env.PERFTOOL_REPORT_COMPARISON': JSON.stringify(comparisonReport),
                'process.env.PERFTOOL_CLIENT_RUNTIME': JSON.stringify(true),
                'process.env.PERFTOOL_CONFIG': JSON.stringify(getClientConfig(config)),
            }),
            new HtmlWebpackPlugin({
                inject: false,
                filename,
                templateContent: ({ htmlWebpackPlugin, compilation }) => `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Perftool Report</title>
                    </head>
                    <body>
                        ${htmlWebpackPlugin.files.js.map(
                            (asset: string) => `
                            <script>
                                ${compilation.assets[asset.substring(htmlWebpackPlugin.files.publicPath.length)].source()}
                            </script>
                        `,
                        )}
                    </body>
                    </html>
                `,
            }),
        ],
    };

    await build(webpackConfig);
    await fsPromises.cp(path.resolve(visualReportDirectory, filename), path.resolve(CWD, visualReportOutputPath));
}
