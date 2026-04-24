import { useState } from 'react'
import { ScrollView, Text, View, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { GlassCard } from '@/components/GlassCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useProfile } from '@/hooks/useProfile'
import { signOut } from '@/hooks/useAuth'
import { colors, typography, fib, radii } from '@/lib/theme'

export default function Profile() {
  const { profile, loading } = useProfile()
  const [signingOut, setSigningOut] = useState(false)

  async function onSignOut() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Se déconnecter ?',
      'Tu retrouveras ton compte en te reconnectant avec ton email.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true)
            await signOut()
            // AuthGate redirige vers /(auth)/login automatiquement
          },
        },
      ],
    )
  }

  const initials = (profile?.full_name ?? profile?.email ?? 'Y')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <ScrollView contentContainerStyle={{ padding: fib.md, gap: fib.md, paddingBottom: fib.xl }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
            Ton voyage YANA
          </Text>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.md,
              fontWeight: '800',
            }}
          >
            Profil
          </Text>
        </View>

        <GlassCard style={{ flexDirection: 'row', gap: fib.sm, alignItems: 'center' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radii.xl,
              backgroundColor: colors.accent.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: typography.display.sm, fontWeight: '800' }}>
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: colors.dark.textPrimary,
                fontSize: typography.body.lg,
                fontWeight: '700',
              }}
            >
              {profile?.full_name ?? 'YANA'}
            </Text>
            <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
              {profile?.email ?? '—'}
            </Text>
            <Text style={{ color: colors.accent.tertiary, fontSize: typography.body.xs, fontWeight: '600' }}>
              Plan {profile?.plan ?? 'Gratuit'} · Niveau {profile?.level ?? 1}
            </Text>
          </View>
        </GlassCard>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.dark.textSecondary,
              fontSize: typography.body.sm,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Mes stats
          </Text>
          <StatRow label="XP total" value={String(profile?.xp ?? 0)} />
          <StatRow label="Points KARMA" value={String(profile?.purama_points ?? 0)} />
          <StatRow label="Streak" value={`${profile?.streak_days ?? 0} jours`} />
        </GlassCard>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.dark.textSecondary,
              fontSize: typography.body.sm,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Compte
          </Text>
          <PrimaryButton
            testID="profile-signout"
            label="Se déconnecter"
            variant="ghost"
            loading={signingOut || loading}
            onPress={onSignOut}
          />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomColor: colors.dark.border,
        borderBottomWidth: 1,
      }}
    >
      <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
        {label}
      </Text>
      <Text
        style={{
          color: colors.dark.textPrimary,
          fontSize: typography.body.sm,
          fontWeight: '600',
        }}
      >
        {value}
      </Text>
    </View>
  )
}
