import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, StatusBar, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import * as Speech from 'expo-speech'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { colors, fib, radii, typography } from '@/lib/theme'
import { useTrip } from '@/hooks/useTrip'
import { useVehicles } from '@/hooks/useVehicles'
import { TripTrackerRN } from '@/lib/trip-tracker'

const KEEP_AWAKE_TAG = 'yana-moto-mode'

function speak(text: string) {
  try {
    Speech.speak(text, { language: 'fr-FR', pitch: 1, rate: 1 })
  } catch {
    // Speech indispo → silencieux. L'action s'exécute quand même.
  }
}

export default function MotoMode() {
  const router = useRouter()
  const { state, start, stop, pause, resume } = useTrip()
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>()
  const { vehicles, primary, loading } = useVehicles()
  const vehicle = vehicleId ? vehicles.find((row) => row.id === vehicleId) : primary
  const [busy, setBusy] = useState(false)
  const keepAwakeActive = useRef(false)

  const isActive = state.status === 'active' || state.status === 'paused'

  const moving = (state.current_speed_kmh ?? 0) > 0

  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).then(() => {
      keepAwakeActive.current = true
    })
    return () => {
      if (keepAwakeActive.current) {
        deactivateKeepAwake(KEEP_AWAKE_TAG)
        keepAwakeActive.current = false
      }
      // Couper la voix si on quitte en plein message.
      Speech.stop()
    }
  }, [])

  useEffect(() => {
    if (state.break_reminder_due) speak('Prévois une pause sur la prochaine aire adaptée.')
  }, [state.break_reminder_due])

  async function onStart() {
    if (busy || isActive) return
    setBusy(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (!vehicle?.id) {
      setBusy(false)
      Alert.alert(
        'Véhicule requis',
        'Sélectionne un véhicule disponible depuis l’écran de départ.',
      )
      return
    }
    const perms = await TripTrackerRN.requestPermissions(true)
    if (!perms.foreground) {
      setBusy(false)
      Alert.alert('Géolocalisation', perms.errorMessage ?? 'Permission refusée.')
      return
    }
    const { error } = await start({
      vehicle_id: vehicle.id,
      trip_mode: 'solo',
      with_background: perms.background,
    })
    setBusy(false)
    if (error) Alert.alert('Démarrage impossible', error)
    else speak('Trajet démarré.')
  }

  async function onStop() {
    if (busy) return
    setBusy(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const res = await stop()
    setBusy(false)
    if (res.error) {
      Alert.alert('Finalisation impossible', res.error)
      return
    }
    if (res.score) {
      const { safety_score, eco_score, seeds_earned } = res.score
      const summary = safety_score === null || eco_score === null
        ? 'Données insuffisantes pour évaluer ce trajet.'
        : `Indices de conduite observée · ${safety_score}/100 sécurité · ${eco_score}/100 éco. ${seeds_earned} Graines.`
      speak('Trajet terminé.')
      Alert.alert('Trajet terminé', summary)
      router.replace('/(tabs)/drive')
    }
  }

  async function onExit() {
    await Haptics.selectionAsync()
    if (isActive) {
      Alert.alert('Trajet en cours', 'Une fois stationné, termine le trajet avant de quitter cet écran.')
      return
    }
    router.back()
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: '#000000' }}
      testID="moto-mode-screen"
    >
      <StatusBar hidden />
      <View style={{ flex: 1, padding: fib.md, gap: fib.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: colors.accent.primary,
              fontSize: typography.display.sm,
              fontWeight: '900',
              letterSpacing: 2,
            }}
          >
            MOTO MODE
          </Text>
          <Pressable
            testID="moto-exit"
            onPress={onExit}
            disabled={moving || busy}
            hitSlop={24}
            accessibilityRole="button"
            accessibilityLabel="Quitter le Moto Mode"
          >
            <Text
              style={{
                color: colors.dark.textSecondary,
                fontSize: typography.body.lg,
                fontWeight: '700',
              }}
            >
              ✕
            </Text>
          </Pressable>
        </View>

        {isActive ? (
          <View>
            <Text style={{ color: '#fff', fontSize: typography.moto.button, fontWeight: '900' }}>
              {(state.distance_m / 1000).toFixed(2)} km
            </Text>
            <Text style={{ color: colors.dark.textSecondary, fontSize: typography.moto.label }}>
              {state.current_speed_kmh === null ? 'Vitesse indisponible' : `${Math.round(state.current_speed_kmh)} km/h · GPS indicatif`}
            </Text>
            <Text style={{ color: colors.dark.textSecondary }}>
              Limitation inconnue{state.break_reminder_due ? ' · Prévois une pause sur la prochaine aire adaptée.' : ''}
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.dark.textSecondary, fontSize: typography.moto.label }}>
            Prépare le trajet à l’arrêt. Dès les premiers signes de fatigue, stationne en sécurité.
          </Text>
        )}

        <View style={{ flex: 1, justifyContent: 'center', gap: fib.md }}>
          <MotoButton
            testID="moto-start"
            label={isActive ? 'TRAJET ACTIF' : '🛵  DÉMARRER'}
            bg={isActive ? '#1f2937' : colors.accent.primary}
            disabled={isActive || busy || loading}
            onPress={onStart}
            accessibilityLabel="Démarrer un trajet"
          />
          <MotoButton
            testID="moto-pause"
            label={state.status === 'paused' ? 'REPRENDRE' : 'PAUSE'}
            bg={colors.accent.primary}
            disabled={!isActive || busy || moving}
            onPress={state.status === 'paused' ? resume : pause}
            accessibilityLabel={state.status === 'paused' ? 'Reprendre le trajet' : 'Mettre en pause'}
          />
          <MotoButton
            testID="moto-stop"
            label="⏹  ARRÊTER"
            bg={isActive ? colors.semantic.error : '#1f2937'}
            disabled={!isActive || busy || moving}
            onPress={onStop}
            accessibilityLabel="Arrêter le trajet"
          />
        </View>

        <Text
          style={{
            color: colors.dark.textMuted,
            textAlign: 'center',
            fontSize: typography.body.xs,
          }}
        >
          Utilise les commandes une fois stationné.
        </Text>
      </View>
    </SafeAreaView>
  )
}

function MotoButton({
  label,
  bg,
  disabled,
  onPress,
  testID,
  accessibilityLabel,
}: {
  label: string
  bg: string
  disabled: boolean
  onPress: () => void | Promise<void>
  testID: string
  accessibilityLabel: string
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={24}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radii.xl,
        minHeight: 160,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: typography.moto.button,
          fontWeight: '900',
          letterSpacing: 1.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
