import '../global.css'
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Linking from 'expo-linking'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/theme'
import { SafeAreaProvider } from 'react-native-safe-area-context'

/**
 * Parse une URL entrante (universal link https://yana.purama.dev/... ou
 * scheme yana://...) et route vers le bon screen. Retourne true si handled.
 */
function handleDeepLinkUrl(
  url: string,
  router: ReturnType<typeof useRouter>,
): boolean {
  try {
    const parsed = Linking.parse(url)
    // path peut être "activate", "trip/abc", "moto", "wallet", ...
    const path = parsed.path ?? ''
    if (!path) return false
    const firstSegment = path.split('/')[0]
    switch (firstSegment) {
      case 'activate': {
        router.replace('/(tabs)/wallet')
        setTimeout(() => {
          Alert.alert('Abonnement activé', 'Tes gains sont débloqués 🎉')
        }, 400)
        return true
      }
      case 'wallet':
        router.replace('/(tabs)/wallet')
        return true
      case 'drive':
        router.replace('/(tabs)/drive')
        return true
      case 'moto':
        router.push('/moto')
        return true
      case 'trip':
        // trip/:id — fallback vers drive pour l'instant (page détail P7.C)
        router.replace('/(tabs)/drive')
        return true
      default:
        return false
    }
  } catch {
    return false
  }
}

function DeepLinkListener() {
  const router = useRouter()
  useEffect(() => {
    // Initial URL (app cold-started depuis un deep link)
    void Linking.getInitialURL().then((url) => {
      if (url) handleDeepLinkUrl(url, router)
    })
    // URLs runtime (app déjà ouverte, OS ramène l'app au foreground)
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLinkUrl(url, router)
    })
    return () => sub.remove()
  }, [router])
  return null
}

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
        <DeepLinkListener />
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
