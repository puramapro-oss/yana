import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { colors, typography } from '@/lib/theme'
import { WEB_URL } from '@/lib/constants'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit() {
    setError(null)
    if (!email.trim()) {
      setError('Renseigne ton email.')
      return
    }
    setLoading(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Le lien Supabase redirige vers l'URL web — le password est réinitialisé
      // dans un onglet navigateur (flow plus robuste que deep link mobile pour P7.A).
      redirectTo: `${WEB_URL}/forgot-password`,
    })
    setLoading(false)
    if (authError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setError(authError.message)
      return
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSent(true)
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
                fontSize: typography.display.md,
                fontWeight: '800',
                color: colors.dark.textPrimary,
              }}
            >
              Réinitialiser le mot de passe
            </Text>
            <Text style={{ fontSize: typography.body.md, color: colors.dark.textSecondary }}>
              Entre ton email, on t'envoie un lien pour choisir un nouveau mot de passe.
            </Text>
          </View>

          {sent ? (
            <View style={{ gap: 12, padding: 16, borderRadius: 14, backgroundColor: colors.dark.bgCard }}>
              <Text style={{ color: colors.semantic.success, fontSize: typography.body.md, fontWeight: '600' }}>
                Email envoyé ✨
              </Text>
              <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
                Vérifie ta boîte (et les spams). Le lien est valable 1 heure.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              <AuthInput
                testID="forgot-email"
                label="Email"
                placeholder="toi@exemple.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                error={error ?? undefined}
              />
              <PrimaryButton
                testID="forgot-submit"
                label="Envoyer le lien"
                loading={loading}
                onPress={onSubmit}
              />
            </View>
          )}

          <View style={{ alignItems: 'center' }}>
            <Link href="/(auth)/login">
              <Text style={{ color: colors.accent.secondary, fontSize: typography.body.sm }}>
                ← Retour à la connexion
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
