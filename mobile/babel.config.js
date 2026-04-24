module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // react-native-worklets/plugin DOIT être en dernier (contrainte lib).
      // Depuis reanimated v4, le plugin a migré vers `react-native-worklets`
      // (le package fournit l'ancien chemin pour compat mais déprécié).
      'react-native-worklets/plugin',
    ],
  }
}
