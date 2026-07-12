module.exports = api => {
    const isProduction = api.env('production');
    const alias = {};

    if (isProduction) {
        alias['^@/components/debug$'] = './src/components/debug/noop.tsx';
        alias['^@/lib/react-native-vdebug/src/log$'] =
            './src/lib/react-native-vdebug/noopLog.ts';
    }
    alias['^@/(.+)'] = './src/\\1';
    alias.webdav = 'webdav/dist/react-native';

    return {
        presets: [
            ['babel-preset-expo', { unstable_transformImportMeta: true }],
        ],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['./'],
                    alias,
                },
            ],
            ...(isProduction ? ['transform-remove-console'] : []),
            'react-native-reanimated/plugin',
        ],
    };
};
