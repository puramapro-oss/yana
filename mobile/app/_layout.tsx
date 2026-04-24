import '../global.css'
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/theme'

/**
 * Auth gate : redirige selon la session.
 * - session présente + segment[0] !== '(tabs)'   → remplace par /(tabs)/dashboard
 * - session absente + segment[0] !== '(auth)'    → remplace par /(auth)/login
 * Pas de loop infinie : on compare aux segments courants avant redirect.
 */
function AuthGate() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    const inTabsGroup = segments[0] === '(tabs)'

    // Écrans authentifiés hors du groupe (tabs) : routes modales comme /moto.
    const authedStandaloneScreens = ['moto']
    const isAuthedStandalone =
      segments.length > 0 && authedStandaloneScreens.includes(segments[0] as string)

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && !inTabsGroup && !isAuthedStandalone) {
      router.replace('/(tabs)/dashboard')
    }
  }, [session, loading, segments, router])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.dark.bgVoid },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="moto"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
