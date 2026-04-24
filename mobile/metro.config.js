const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

/**
 * Metro config — ajoute le pipeline NativeWind (CSS → atomic styles RN)
 * et garde les transforms Expo par défaut (Hermes, react-native-web, etc.).
 */
const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, {
  input: './global.css',
  // Auto-inlines le generated stylesheet dans le bundle natif.
  inlineRem: 16,
})
