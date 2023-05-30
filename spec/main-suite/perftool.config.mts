import webpack from 'webpack';
import type { Config } from '@salutejs/perftool';

const config: Config = {
    retries: 30,
    taskConfiguration: {
        render: {
            renderWaitTimeout: 200,
        },
        rerender: {
            renderWaitTimeout: 200,
        },
    },
    include: ['src/**/*.perftest.tsx'],
    displayIntermediateCalculations: false,
    failOnSignificantChanges: false,
    stabilizers: ['staticTask'],
    absoluteError: 1,
    cache: {
        taskState: true,
    },
    cacheExpirationTime: 1000000,
    modifyWebpackConfig(conf) {
        const babelLoaderOpts = conf.module?.rules?.find(
            (rule) => typeof rule === 'object' && rule.loader?.includes('babel-loader'),
        );

        if (typeof babelLoaderOpts === 'object' && typeof babelLoaderOpts?.options === 'object') {
            babelLoaderOpts?.options?.plugins?.push('babel-plugin-styled-components');
        }

        conf.plugins?.push(
            new webpack.DefinePlugin({
                'process.env.SLOW': process.env.SLOW,
            }),
        );

        return conf;
    },
};

export default config;
