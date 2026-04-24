import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View, Linking, RefreshControl } from 'react-native'
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
  seats_booked: number
  status: string
  total_price_cents: number
  created_at: string
}

export default function Carpool() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBookings([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('carpool_bookings')
      .select('id, carpool_id, seats_booked, status, total_price_cents, created_at')
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setBookings((data ?? []) as Booking[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function openCarpoolOnWeb() {
    await Haptics.selectionAsync()
    Linking.openURL(`${WEB_URL}/carpool`)
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

        {bookings.length === 0 ? (
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
              Partage un trajet : divise les coûts, double la joie, plante des arbres.
            </Text>
            <PrimaryButton
              testID="carpool-search-web"
              label="Chercher un trajet"
              onPress={openCarpoolOnWeb}
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
                    {b.seats_booked} place{b.seats_booked > 1 ? 's' : ''}
                  </Text>
                  <Text
                    style={{
                      color: b.status === 'confirmed' ? colors.semantic.success : colors.semantic.warning,
                      fontSize: typography.body.sm,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {b.status}
                  </Text>
                </View>
                <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                  {new Date(b.created_at).toLocaleDateString('fr-FR')} ·{' '}
                  {(b.total_price_cents / 100).toFixed(2).replace('.', ',')} €
                </Text>
              </GlassCard>
            ))}
            <PrimaryButton
              testID="carpool-new-web"
              label="Nouveau trajet"
              variant="secondary"
              onPress={openCarpoolOnWeb}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
