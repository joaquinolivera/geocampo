module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for Tamagui
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: '../../packages/ui/src/tamagui.config.ts',
          logTimings: true,
        },
      ],
      // Required for reanimated (if used)
      'react-native-reanimated/plugin',
    ],
  };
};
