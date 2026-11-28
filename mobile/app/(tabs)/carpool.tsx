import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View, Linking, RefreshControl, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { GlassCard } from '@/components/GlassCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { supabase } from '@/lib/supabase'
import { colors, typography, fib } from '@/lib/theme'
import { WEB_URL } from '@/lib/constants'

type Booking = {
  id: string
  carpool_id: string
  seats: number
  status: string
  total_price_cents: number
  booked_at: string
}

const BOOKING_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmée', in_progress: 'En cours',
  completed: 'Terminée', cancelled: 'Annulée', disputed: 'En litige',
}

export default function Carpool() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError
      if (!user) {
        setBookings([])
        return
      }
      const { data, error } = await supabase
        .from('carpool_bookings')
        .select('id, carpool_id, seats, status, total_price_cents, booked_at')
        .eq('passenger_id', user.id)
        .order('booked_at', { ascending: false })
        .limit(10)
      if (error) throw error
      setBookings((data ?? []) as Booking[])
    } catch {
      setBookings([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }

  }, [])

  useEffect(() => { void (async () => { await fetchBookings(); })(); }, [fetchBookings])

  async function openCarpoolOnWeb(path = '/carpool') {
    void Haptics.selectionAsync().catch(() => {})
    try {
      await Linking.openURL(`${WEB_URL}${path}`)
    } catch {
      Alert.alert('Lien indisponible', 'Réessaie depuis tes réservations.')
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <ScrollView
        contentContainerStyle={{ padding: fib.md, gap: fib.md, paddingBottom: fib.xl }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchBookings}
            tintColor={colors.accent.secondary}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
            Covoiturage conscient
          </Text>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.md,
              fontWeight: '800',
            }}
          >
            Mes trajets partagés
          </Text>
        </View>

        {loadError ? (
          <GlassCard style={{ gap: fib.sm }}>
            <Text style={{ color: colors.dark.textPrimary }}>Impossible de charger tes réservations.</Text>
            <PrimaryButton label="Réessayer" onPress={fetchBookings} />
          </GlassCard>
        ) : loading && bookings.length === 0 ? null : bookings.length === 0 ? (
          <GlassCard style={{ gap: fib.xs, alignItems: 'center', padding: fib.lg }}>
            <Text
              style={{
                color: colors.dark.textSecondary,
                fontSize: typography.body.md,
                textAlign: 'center',
              }}
            >
              Aucune réservation pour l&apos;instant.
            </Text>
            <Text
              style={{
                color: colors.dark.textMuted,
                fontSize: typography.body.sm,
                textAlign: 'center',
              }}
            >
              Trouve une place sur un trajet déjà prévu.
            </Text>
            <PrimaryButton
              testID="carpool-search-web"
              label="Chercher un trajet"
              onPress={() => void openCarpoolOnWeb()}
            />
          </GlassCard>
        ) : (
          <View style={{ gap: fib.sm }}>
            {bookings.map((b) => (
              <GlassCard key={b.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      color: colors.dark.textPrimary,
                      fontSize: typography.body.md,
                      fontWeight: '600',
                    }}
                  >
                    {b.seats} place{b.seats > 1 ? 's' : ''}
                  </Text>
                  <Text
                    style={{
                      color: b.status === 'confirmed' ? colors.semantic.success : colors.semantic.warning,
                      fontSize: typography.body.sm,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {BOOKING_LABELS[b.status] ?? b.status}
                  </Text>
                </View>
                <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                  {new Date(b.booked_at).toLocaleDateString('fr-FR')} ·{' '}
                  Prix de la réservation · {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(b.total_price_cents / 100)}
                </Text>
                <PrimaryButton label="Détails et récapitulatif" variant="ghost"
                  onPress={() => void openCarpoolOnWeb(`/carpool/${b.carpool_id}`)} />
              </GlassCard>
            ))}
            <PrimaryButton
              testID="carpool-new-web"
              label="Nouveau trajet"
              variant="secondary"
              onPress={() => void openCarpoolOnWeb('/carpool/new')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
