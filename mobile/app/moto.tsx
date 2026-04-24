import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, StatusBar, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import * as Speech from 'expo-speech'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useRouter } from 'expo-router'
import { colors, fib, radii, typography } from '@/lib/theme'
import { useTrip } from '@/hooks/useTrip'
import { useVehicles } from '@/hooks/useVehicles'
import { TripTrackerRN } from '@/lib/trip-tracker'
import { enqueueEvent } from '@/lib/event-queue'
import type { DetectedEventPayload } from '@/lib/trip-api'

const KEEP_AWAKE_TAG = 'yana-moto-mode'

/**
 * Moto Mode — écran plein écran haute lisibilité pour usage casque/gants.
 *
 * Règles ergonomiques :
 *  - OLED pur #000000, 3 boutons ≥ 160×160, couleurs contrastées 1 coup d'œil.
 *  - Chaque press = Haptics.Heavy + TTS FR confirmant l'action (lecture audio
 *    suffisante sans regarder l'écran).
 *  - Screen keep-awake actif tout le temps que l'écran est monté.
 *  - Aucun texte parasite, aucune info secondaire.
 *  - Bouton "Obstacle" enqueue un event dédié (marqué focus_maintained severity 3
 *    avec metadata.type='moto_obstacle' — stocké dans la queue existante).
 *  - iOS Apple guidelines §23 : textes neutres, aucun mot "paiement"/"abo".
 */
function speak(text: string) {
  try {
    Speech.speak(text, { language: 'fr-FR', pitch: 1, rate: 1 })
  } catch {
    // Speech indispo → silencieux. L'action s'exécute quand même.
  }
}

export default function MotoMode() {
  const router = useRouter()
  const { state, start, stop, cancel } = useTrip()
  const { primary } = useVehicles()
  const [busy, setBusy] = useState(false)
  const keepAwakeActive = useRef(false)

  const isActive = state.status === 'active' || state.status === 'paused'

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

  async function onStart() {
    if (busy || isActive) return
    setBusy(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    speak('Trajet démarré. Conduis en conscience.')
    if (!primary?.id) {
      setBusy(false)
      Alert.alert(
        'Véhicule requis',
        'Ajoute un véhicule principal depuis le site pour démarrer en Moto Mode.',
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
      vehicle_id: primary.id,
      trip_mode: 'solo',
      with_background: perms.background,
    })
    setBusy(false)
    if (error) Alert.alert('Démarrage impossible', error)
  }

  async function onObstacle() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    speak('Obstacle signalé.')
    if (!state.trip_id) return
    const now = new Date().toISOString()
    const event: DetectedEventPayload = {
      event_type: 'focus_maintained',
      severity: 3,
      speed_kmh: Math.round(state.current_speed_kmh),
      speed_limit_kmh: null,
      g_force: null,
      lat_rounded: null,
      lng_rounded: null,
      occurred_at: now,
    }
    enqueueEvent(event)
  }

  async function onStop() {
    if (busy) return
    setBusy(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    speak('Trajet terminé. Calcul de ton score.')
    const res = await stop()
    setBusy(false)
    if (res.error) {
      Alert.alert('Finalisation impossible', res.error)
      return
    }
    if (res.score) {
      speak(
        `Score sécurité ${res.score.safety_score} sur 100. Score écologie ${res.score.eco_score} sur 100.`,
      )
      Alert.alert(
        'Trajet terminé',
        `SAFE ${res.score.safety_score}/100 · GREEN ${res.score.eco_score}/100\n+${res.score.seeds_earned} seeds`,
      )
      router.replace('/(tabs)/drive')
    }
  }

  async function onExit() {
    await Haptics.selectionAsync()
    if (isActive) {
      Alert.alert(
        'Quitter le Moto Mode ?',
        'Ton trajet continue en arrière-plan. Tu peux revenir dans le Moto Mode depuis Drive.',
        [
          { text: 'Rester', style: 'cancel' },
          {
            text: 'Quitter',
            onPress: () => {
              router.back()
            },
          },
        ],
      )
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
              {state.current_speed_kmh.toFixed(0)} km/h
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.dark.textSecondary, fontSize: typography.moto.label }}>
            Écran conduite. Contrôles haptiques + voix.
          </Text>
        )}

        <View style={{ flex: 1, justifyContent: 'center', gap: fib.md }}>
          <MotoButton
            testID="moto-start"
            label={isActive ? 'TRAJET ACTIF' : '🛵  DÉMARRER'}
            bg={isActive ? '#1f2937' : colors.accent.primary}
            disabled={isActive || busy}
            onPress={onStart}
            accessibilityLabel="Démarrer un trajet"
          />
          <MotoButton
            testID="moto-obstacle"
            label="⚠️  OBSTACLE"
            bg={isActive ? colors.semantic.warning : '#1f2937'}
            disabled={!isActive}
            onPress={onObstacle}
            accessibilityLabel="Signaler un obstacle"
          />
          <MotoButton
            testID="moto-stop"
            label="⏹  ARRÊTER"
            bg={isActive ? colors.semantic.error : '#1f2937'}
            disabled={!isActive || busy}
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
          Reste concentré sur la route. YANA écoute ton trajet.
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
