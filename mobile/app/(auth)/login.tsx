import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { colors, typography } from '@/lib/theme'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setError(null)
    if (!email.trim() || !password) {
      setError('Remplis email et mot de passe.')
      return
    }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (authError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setError(frenchifyAuthError(authError.message))
      return
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    // AuthGate dans _layout.tsx redirige vers /(tabs)/dashboard automatiquement
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: typography.display.lg,
                fontWeight: '800',
                color: colors.dark.textPrimary,
              }}
            >
              Bienvenue chez toi
            </Text>
            <Text style={{ fontSize: typography.body.md, color: colors.dark.textSecondary }}>
              Connecte-toi à ton voyage YANA.
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <AuthInput
              testID="login-email"
              label="Email"
              placeholder="toi@exemple.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <AuthInput
              testID="login-password"
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              error={error ?? undefined}
            />
            <PrimaryButton
              testID="login-submit"
              label="Se connecter"
              loading={loading}
              onPress={onSubmit}
            />
          </View>

          <View style={{ gap: 12, alignItems: 'center' }}>
            <Link href="/(auth)/forgot" style={{ color: colors.accent.secondary }}>
              <Text style={{ color: colors.accent.secondary, fontSize: typography.body.sm }}>
                Mot de passe oublié ?
              </Text>
            </Link>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
                Pas encore de compte ?
              </Text>
              <Link href="/(auth)/signup">
                <Text style={{ color: colors.accent.primary, fontSize: typography.body.sm, fontWeight: '600' }}>
                  Crée-le
                </Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function frenchifyAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.'
  if (/email not confirmed/i.test(msg)) return 'Confirme ton email avant de te connecter.'
  if (/rate limit/i.test(msg)) return 'Trop de tentatives. Attends quelques minutes.'
  return msg
}
