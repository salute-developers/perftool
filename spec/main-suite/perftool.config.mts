import webpack from 'webpack';
import type { Config } from '@salutejs/perftool';

const config: Config = {
    include: ['src/**/*.perftest.tsx'],
    failOnSignificantChanges: false,
    cache: {
        taskState: true,
    },
    modifyWebpackConfig(conf) {
        const babelLoaderOpts = conf.module?.rules?.find(
            (rule) => rule && typeof rule === 'object' && rule.loader?.includes('babel-loader'),
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
