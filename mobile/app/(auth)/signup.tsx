import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { colors, typography } from '@/lib/theme'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit() {
    setError(null)
    setInfo(null)
    if (!email.trim() || !password || !fullName.trim()) {
      setError('Remplis tous les champs pour créer ton compte.')
      return
    }
    if (password.length < 8) {
      setError('Mot de passe : 8 caractères minimum.')
      return
    }
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    setLoading(false)
    if (authError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setError(frenchifyAuthError(authError.message))
      return
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (data.session) {
      // AUTOCONFIRM activé côté VPS : session immédiate → AuthGate redirige
      return
    }
    setInfo('Ton compte est créé. Vérifie ta boîte mail pour le confirmer.')
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
              Rejoins le voyage
            </Text>
            <Text style={{ fontSize: typography.body.md, color: colors.dark.textSecondary }}>
              Crée ton compte YANA — chaque trajet devient une méditation en mouvement.
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <AuthInput
              testID="signup-fullname"
              label="Prénom et nom"
              placeholder="Alex Martin"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
            />
            <AuthInput
              testID="signup-email"
              label="Email"
              placeholder="toi@exemple.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <AuthInput
              testID="signup-password"
              label="Mot de passe (8 caractères minimum)"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              error={error ?? undefined}
            />
            {info ? (
              <Text
                style={{
                  color: colors.semantic.success,
                  fontSize: typography.body.sm,
                }}
              >
                {info}
              </Text>
            ) : null}
            <PrimaryButton
              testID="signup-submit"
              label="Créer mon compte"
              loading={loading}
              onPress={onSubmit}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
              Déjà un compte ?
            </Text>
            <Link href="/(auth)/login">
              <Text style={{ color: colors.accent.primary, fontSize: typography.body.sm, fontWeight: '600' }}>
                Connexion
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function frenchifyAuthError(msg: string): string {
  if (/already registered|user already exists/i.test(msg)) return 'Cet email a déjà un compte. Connecte-toi.'
  if (/rate limit/i.test(msg)) return 'Trop de tentatives. Attends quelques minutes.'
  if (/password.*(weak|short)/i.test(msg)) return 'Mot de passe trop faible.'
  return msg
}
