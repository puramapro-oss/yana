module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // react-native-reanimated DOIT être en dernier (contrainte lib)
      'react-native-reanimated/plugin',
    ],
  }
}
