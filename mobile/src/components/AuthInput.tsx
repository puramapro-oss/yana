import { useState } from 'react'
import { TextInput, View, Text, type TextInputProps } from 'react-native'
import { colors, radii, typography } from '@/lib/theme'

type Props = TextInputProps & {
  label: string
  error?: string
}

/**
 * Input auth (email, mot de passe, reset).
 * Bordure bleue au focus, rouge en erreur, gris sinon.
 */
export function AuthInput({ label, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const borderColor = error
    ? colors.semantic.error
    : focused
    ? colors.accent.secondary
    : colors.dark.border

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: colors.dark.textSecondary,
          fontSize: typography.body.sm,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.dark.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            backgroundColor: colors.dark.bgCard,
            borderColor,
            borderWidth: 1,
            borderRadius: radii.md,
            paddingVertical: 12,
            paddingHorizontal: 14,
            fontSize: typography.body.md,
            color: colors.dark.textPrimary,
            minHeight: 48,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ color: colors.semantic.error, fontSize: typography.body.xs }}>{error}</Text>
      ) : null}
    </View>
  )
}
