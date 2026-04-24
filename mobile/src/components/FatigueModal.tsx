import { Modal, View, Text } from 'react-native'
import { PrimaryButton } from './PrimaryButton'
import { colors, fib, radii, typography } from '@/lib/theme'
import { fatigueColor, fatigueLabel, fatigueNamaMessage, type FatigueSignal } from '@/lib/health'

interface Props {
  visible: boolean
  signal: FatigueSignal | null
  onAcknowledge: () => void
  onCancel: () => void
}

/**
 * Modal bloquante NAMA-PILOTE quand fatigue ≥ 2.
 * L'utilisateur DOIT confirmer "Je reste vigilant" pour continuer ou annuler.
 * Aucune fermeture par swipe/tap outside — c'est un garde-fou.
 */
export function FatigueModal({ visible, signal, onAcknowledge, onCancel }: Props) {
  if (!signal) return null
  const accent = fatigueColor(signal.level)
  const label = fatigueLabel(signal.level)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID="fatigue-modal"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          padding: fib.md,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: colors.dark.bgNebula,
            borderRadius: radii.lg,
            padding: fib.md,
            gap: fib.sm,
            borderWidth: 1,
            borderColor: accent,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fib.xs }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: accent,
              }}
            />
            <Text
              style={{
                color: accent,
                fontSize: typography.body.sm,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              NAMA-PILOTE · Fatigue {label}
            </Text>
          </View>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.sm,
              fontWeight: '800',
            }}
          >
            Ton corps te parle.
          </Text>
          <Text
            style={{
              color: colors.dark.textSecondary,
              fontSize: typography.body.md,
              lineHeight: 22,
            }}
          >
            {fatigueNamaMessage(signal)}
          </Text>
          <View style={{ flexDirection: 'row', gap: fib.xs }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                testID="fatigue-cancel"
                label="Reporter"
                variant="ghost"
                onPress={onCancel}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                testID="fatigue-acknowledge"
                label="Je reste vigilant"
                onPress={onAcknowledge}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
