import { View, type ViewProps, type ViewStyle } from 'react-native'
import { colors, radii } from '@/lib/theme'

type Props = ViewProps & {
  /** Style de carte — "glass" (bg translucide) ou "solid" (bg opaque deep). */
  variant?: 'glass' | 'solid'
}

/**
 * Carte glass réutilisable — mirror de .glass-card web (bg-white/5 border-white/6).
 * Pas de blur natif par défaut (coût performance mobile) ; blur sur demande
 * via BlurView @react-native-community/blur en A5 si besoin.
 */
export function GlassCard({ variant = 'glass', style, children, ...rest }: Props) {
  const cardStyle: ViewStyle = {
    backgroundColor: variant === 'glass' ? colors.dark.bgCard : colors.dark.bgDeep,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
  }
  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  )
}
