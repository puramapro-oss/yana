import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View, Linking, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { GlassCard } from '@/components/GlassCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { supabase } from '@/lib/supabase'
import { colors, typography, fib } from '@/lib/theme'
import { WALLET_MIN_WITHDRAWAL_EUR, WEB_URL } from '@/lib/constants'
import { useProfile } from '@/hooks/useProfile'

type Tx = {
  id: string
  amount_cents: number
  type: string
  description: string | null
  created_at: string
}

export default function Wallet() {
  const { profile, refresh: refreshProfile } = useProfile()
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTxs = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setTxs([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('wallet_transactions')
      .select('id, amount_cents, type, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setTxs((data ?? []) as Tx[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTxs()
  }, [fetchTxs])

  async function openWithdrawalOnWeb() {
    await Haptics.selectionAsync()
    Linking.openURL(`${WEB_URL}/wallet`)
  }

  const balanceEur = (profile?.wallet_balance_cents ?? 0) / 100
  const canWithdraw = balanceEur >= WALLET_MIN_WITHDRAWAL_EUR

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <ScrollView
        contentContainerStyle={{ padding: fib.md, gap: fib.md, paddingBottom: fib.xl }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              fetchTxs()
              refreshProfile()
            }}
            tintColor={colors.accent.secondary}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
            Ton équilibre financier
          </Text>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.md,
              fontWeight: '800',
            }}
          >
            Wallet
          </Text>
        </View>

        <GlassCard style={{ gap: fib.sm }}>
          <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
            Solde disponible
          </Text>
          <Text
            style={{
              color: colors.semantic.success,
              fontSize: typography.display.xl,
              fontWeight: '800',
            }}
          >
            {balanceEur.toFixed(2).replace('.', ',')} €
          </Text>
          <PrimaryButton
            testID="wallet-withdraw-web"
            label={canWithdraw ? 'Demander un retrait' : `Retrait dès ${WALLET_MIN_WITHDRAWAL_EUR} €`}
            disabled={!canWithdraw}
            onPress={openWithdrawalOnWeb}
          />
        </GlassCard>

        <View style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.dark.textSecondary,
              fontSize: typography.body.sm,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Historique
          </Text>
          {txs.length === 0 ? (
            <GlassCard>
              <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
                Aucune transaction pour l&apos;instant.
              </Text>
            </GlassCard>
          ) : (
            txs.map((tx) => {
              const amountEur = tx.amount_cents / 100
              const positive = amountEur >= 0
              return (
                <GlassCard key={tx.id} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text
                      style={{
                        color: colors.dark.textPrimary,
                        fontSize: typography.body.md,
                        fontWeight: '500',
                      }}
                    >
                      {tx.description ?? tx.type}
                    </Text>
                    <Text
                      style={{
                        color: positive ? colors.semantic.success : colors.semantic.error,
                        fontSize: typography.body.md,
                        fontWeight: '700',
                      }}
                    >
                      {positive ? '+' : ''}
                      {amountEur.toFixed(2).replace('.', ',')} €
                    </Text>
                  </View>
                  <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
                    {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </GlassCard>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
