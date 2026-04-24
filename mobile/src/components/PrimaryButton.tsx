import { ActivityIndicator, Pressable, Text, type PressableProps, type ViewStyle } from 'react-native'
import { colors, radii, typography } from '@/lib/theme'

type Props = Omit<PressableProps, 'children'> & {
  label: string
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  testID?: string
}

/**
 * Bouton standard YANA avec état loading intégré.
 * - variant primary → gradient #F97316 → #0EA5E9 (orange route → bleu voyage)
 *   NB : LinearGradient vient en A5 ; ici on fait une couleur pleine #F97316
 *   pour A3 suffisant au flow auth. Le gradient visuel arrivera avec le polish.
 * - hit-slop auto 8px pour conformité Apple/Google >=44px tactile
 */
export function PrimaryButton({
  label,
  loading,
  disabled,
  variant = 'primary',
  style,
  testID,
  ...rest
}: Props) {
  const isDisabled = disabled || loading
  const baseBg =
    variant === 'primary' ? colors.accent.primary
    : variant === 'secondary' ? colors.accent.secondary
    : 'transparent'
  const textColor =
    variant === 'ghost' ? colors.accent.primary : '#ffffff'

  return (
    <Pressable
      testID={testID}
      disabled={isDisabled}
      hitSlop={8}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      style={({ pressed }) => {
        const s: ViewStyle = {
          backgroundColor: baseBg,
          borderRadius: radii.md,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          minHeight: 48,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? colors.accent.primary : 'transparent',
        }
        return [s, typeof style === 'function' ? style({ pressed }) : style]
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontSize: typography.body.md, fontWeight: '600' }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}
