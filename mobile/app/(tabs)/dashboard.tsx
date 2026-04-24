import { ScrollView, Text, View, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassCard } from '@/components/GlassCard'
import { useProfile } from '@/hooks/useProfile'
import { colors, typography, fib, radii } from '@/lib/theme'

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <GlassCard style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: accent, fontSize: typography.display.md, fontWeight: '800' }}>
        {value}
      </Text>
      <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>{label}</Text>
    </GlassCard>
  )
}

export default function Dashboard() {
  const { profile, loading, refresh } = useProfile()

  const displayName = profile?.full_name ?? profile?.email?.split('@')[0] ?? 'conducteur·rice'
  const points = profile?.purama_points ?? 0
  const level = profile?.level ?? 1
  const streak = profile?.streak_days ?? 0
  const walletEur = (profile?.wallet_balance_cents ?? 0) / 100

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <ScrollView
        contentContainerStyle={{ padding: fib.md, gap: fib.md, paddingBottom: fib.xl }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.accent.secondary}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
            Bienvenue chez toi
          </Text>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.md,
              fontWeight: '800',
            }}
          >
            Salut {displayName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: fib.sm }}>
          <Stat label="Points KARMA" value={String(points)} accent={colors.accent.primary} />
          <Stat label="Niveau" value={String(level)} accent={colors.accent.tertiary} />
          <Stat label="Streak 🔥" value={`${streak}j`} accent={colors.semantic.gold} />
        </View>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.dark.textSecondary,
              fontSize: typography.body.sm,
              fontWeight: '600',
            }}
          >
            Ton wallet
          </Text>
          <Text
            style={{
              color: colors.semantic.success,
              fontSize: typography.display.lg,
              fontWeight: '800',
            }}
          >
            {walletEur.toFixed(2).replace('.', ',')} €
          </Text>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.xs }}>
            Retrait IBAN dès 5 € · onglet Wallet pour détail.
          </Text>
        </GlassCard>

        <GlassCard
          style={{
            gap: fib.xs,
            borderRadius: radii.lg,
            borderColor: colors.accent.secondary,
            borderWidth: 1,
          }}
        >
          <Text
            style={{
              color: colors.accent.secondary,
              fontSize: typography.body.sm,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            NAMA-PILOTE
          </Text>
          <Text style={{ color: colors.dark.textPrimary, fontSize: typography.body.md }}>
            Ton copilote IA veille sur ta conduite : sécurité routière, écoconduite, et sagesse
            du voyage. Chaque trajet devient une méditation en mouvement.
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  )
}
