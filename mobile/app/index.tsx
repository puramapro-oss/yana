import { View, ActivityIndicator } from 'react-native'
import { colors } from '@/lib/theme'

/**
 * Route racine "/". N'est jamais rendue plus de quelques frames :
 * AuthGate (dans app/_layout.tsx) redirige immédiatement vers
 * - /(auth)/login si session absente
 * - /(tabs)/dashboard si session présente
 * Ce spinner est un filet de sécurité pendant le hydrate initial.
 */
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.dark.bgVoid,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="large" color={colors.accent.secondary} />
    </View>
  )
}
