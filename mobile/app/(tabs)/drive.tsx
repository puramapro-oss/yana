import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, View, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { GlassCard } from '@/components/GlassCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { colors, typography, fib, radii } from '@/lib/theme'
import { WEB_URL } from '@/lib/constants'
import { useVehicles } from '@/hooks/useVehicles'
import { useTrip } from '@/hooks/useTrip'
import { TripTrackerRN } from '@/lib/trip-tracker'
import type { VehicleRow } from '@/lib/trip-api'

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`
  return `${(m / 1000).toFixed(2)} km`
}

function vehicleLabel(v: VehicleRow): string {
  const parts = [v.brand, v.model].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : v.vehicle_type.toUpperCase()
}

export default function Drive() {
  const router = useRouter()
  const { vehicles, primary, loading: vehiclesLoading, error: vehiclesError, refresh } = useVehicles()
  const { state, start, stop, cancel } = useTrip()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const vehicleId = useMemo(
    () => selectedId ?? primary?.id ?? null,
    [selectedId, primary],
  )

  async function handleStart() {
    if (!vehicleId) {
      Alert.alert('Véhicule requis', 'Ajoute un véhicule depuis le site web pour démarrer un trajet.')
      return
    }
    setBusy(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const perms = await TripTrackerRN.requestPermissions(false)
    if (!perms.foreground) {
      setBusy(false)
      Alert.alert('Géolocalisation', perms.errorMessage ?? 'Permission refusée.')
      return
    }
    const { error } = await start({ vehicle_id: vehicleId, trip_mode: 'solo' })
    setBusy(false)
    if (error) {
      Alert.alert('Démarrage impossible', error)
      return
    }
  }

  async function handleStop() {
    if (busy) return
    setBusy(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const res = await stop()
    setBusy(false)
    if (res.error) {
      Alert.alert('Finalisation impossible', res.error)
      return
    }
    if (res.score) {
      Alert.alert(
        'Trajet terminé 🌱',
        `SAFE ${res.score.safety_score}/100 · GREEN ${res.score.eco_score}/100\n` +
          `${formatDistance(res.distance_km * 1000)} en ${formatDuration(res.duration_sec)}\n` +
          `+${res.score.seeds_earned} seeds · ${res.score.medal.toUpperCase()}`,
      )
    }
  }

  async function handleCancel() {
    if (busy) return
    Alert.alert(
      'Annuler le trajet ?',
      'Aucun score ne sera enregistré.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler',
          style: 'destructive',
          onPress: async () => {
            setBusy(true)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            await cancel()
            setBusy(false)
          },
        },
      ],
    )
  }

  const isActive = state.status === 'active' || state.status === 'paused'
  const canStart = !isActive && !busy && vehicleId !== null

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <ScrollView contentContainerStyle={{ padding: fib.md, gap: fib.md, paddingBottom: fib.xl }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
            Conduire en conscience
          </Text>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.md,
              fontWeight: '800',
            }}
          >
            SAFE & GREEN DRIVE
          </Text>
        </View>

        {isActive ? (
          <GlassCard style={{ gap: fib.sm }}>
            <Text
              style={{
                color: colors.accent.primary,
                fontSize: typography.body.sm,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Trajet en cours
            </Text>
            <View style={{ flexDirection: 'row', gap: fib.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                  DISTANCE
                </Text>
                <Text
                  style={{
                    color: colors.dark.textPrimary,
                    fontSize: typography.display.sm,
                    fontWeight: '700',
                  }}
                  testID="drive-distance"
                >
                  {formatDistance(state.distance_m)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                  DURÉE
                </Text>
                <Text
                  style={{
                    color: colors.dark.textPrimary,
                    fontSize: typography.display.sm,
                    fontWeight: '700',
                  }}
                  testID="drive-duration"
                >
                  {formatDuration(state.duration_sec)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: fib.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                  VITESSE
                </Text>
                <Text
                  style={{
                    color: colors.dark.textPrimary,
                    fontSize: typography.body.lg,
                    fontWeight: '600',
                  }}
                >
                  {state.current_speed_kmh.toFixed(0)} km/h
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                  ÉVÉNEMENTS
                </Text>
                <Text
                  style={{
                    color: colors.dark.textPrimary,
                    fontSize: typography.body.lg,
                    fontWeight: '600',
                  }}
                >
                  {state.events_count}
                </Text>
              </View>
            </View>
            <PrimaryButton
              testID="drive-stop"
              label={busy ? 'Finalisation…' : 'Arrêter le trajet'}
              onPress={handleStop}
              disabled={busy}
              loading={busy && state.status === 'ending'}
            />
            <PrimaryButton
              testID="drive-cancel"
              label="Annuler ce trajet"
              variant="ghost"
              onPress={handleCancel}
              disabled={busy}
            />
            <PrimaryButton
              testID="drive-moto-mode"
              label="🛵 Activer Moto Mode"
              variant="secondary"
              onPress={() => router.push('/moto')}
            />
          </GlassCard>
        ) : (
          <GlassCard style={{ gap: fib.sm }}>
            <Text
              style={{
                color: colors.accent.primary,
                fontSize: typography.body.sm,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Prêt à rouler
            </Text>
            {vehiclesLoading ? (
              <ActivityIndicator color={colors.accent.primary} />
            ) : vehiclesError ? (
              <View style={{ gap: fib.xs }}>
                <Text style={{ color: colors.semantic.error, fontSize: typography.body.sm }}>
                  {vehiclesError}
                </Text>
                <PrimaryButton label="Réessayer" variant="ghost" onPress={refresh} />
              </View>
            ) : vehicles.length === 0 ? (
              <View style={{ gap: fib.xs }}>
                <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
                  Ajoute ton premier véhicule depuis le site pour débloquer le tracking SAFE & GREEN.
                </Text>
                <PrimaryButton
                  testID="drive-add-vehicle"
                  label="Ajouter sur yana.purama.dev"
                  variant="secondary"
                  onPress={() => Linking.openURL(`${WEB_URL}/vehicles`)}
                />
              </View>
            ) : (
              <View style={{ gap: fib.xs }}>
                {vehicles.map((v) => {
                  const isSel = (selectedId ?? primary?.id) === v.id
                  return (
                    <PrimaryButton
                      key={v.id}
                      testID={`drive-vehicle-${v.id}`}
                      label={`${isSel ? '● ' : '○ '}${vehicleLabel(v)}${v.is_primary ? ' (principal)' : ''}`}
                      variant={isSel ? 'primary' : 'ghost'}
                      onPress={() => {
                        void Haptics.selectionAsync()
                        setSelectedId(v.id)
                      }}
                    />
                  )
                })}
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.dark.border,
                    marginVertical: fib.xs,
                  }}
                />
                <PrimaryButton
                  testID="drive-start"
                  label={busy ? 'Démarrage…' : '▶︎ Démarrer un trajet'}
                  onPress={handleStart}
                  disabled={!canStart}
                  loading={busy && state.status === 'starting'}
                />
                {state.error ? (
                  <Text
                    style={{
                      color: colors.semantic.error,
                      fontSize: typography.body.sm,
                      marginTop: fib.xs,
                    }}
                  >
                    {state.error}
                  </Text>
                ) : null}
              </View>
            )}
          </GlassCard>
        )}

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.semantic.success,
              fontSize: typography.body.sm,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Écoconduite
          </Text>
          <Text style={{ color: colors.dark.textPrimary, fontSize: typography.body.md }}>
            Conduire doucement dépollue. YANA calcule les kg CO₂ évités via le facteur ADEME, et
            transforme 10 kg évités en un arbre réellement planté chez Tree-Nation.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.accent.tertiary,
              fontSize: typography.body.sm,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Ouvrir sur le web
          </Text>
          <Text
            style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}
          >
            Carte détaillée, événements sur polyline et gestion des véhicules restent sur{' '}
            <Text style={{ color: colors.accent.secondary }}>yana.purama.dev</Text> pour l&apos;instant.
          </Text>
          <View
            style={{
              borderRadius: radii.md,
              overflow: 'hidden',
              marginTop: fib.xs,
            }}
          >
            <PrimaryButton
              testID="drive-open-web"
              label="Ouvrir sur yana.purama.dev"
              variant="ghost"
              onPress={() => {
                void Haptics.selectionAsync()
                Linking.openURL(`${WEB_URL}/drive`)
              }}
            />
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  )
}
