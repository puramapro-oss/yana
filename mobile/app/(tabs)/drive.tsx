import { ScrollView, Text, View, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { GlassCard } from '@/components/GlassCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { colors, typography, fib } from '@/lib/theme'
import { WEB_URL } from '@/lib/constants'

export default function Drive() {
  async function openDriveOnWeb() {
    await Haptics.selectionAsync()
    Linking.openURL(`${WEB_URL}/drive`)
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.dark.bgVoid }}>
      <ScrollView contentContainerStyle={{ padding: fib.md, gap: fib.md, paddingBottom: fib.xl }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.dark.textMuted, fontSize: typography.body.sm }}>
            Conduire en conscience
          </Text>
          <Text
            style={{
              color: colors.dark.textPrimary,
              fontSize: typography.display.md,
              fontWeight: '800',
            }}
          >
            SAFE & GREEN DRIVE
          </Text>
        </View>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.accent.primary,
              fontSize: typography.body.sm,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Sécurité routière
          </Text>
          <Text style={{ color: colors.dark.textPrimary, fontSize: typography.body.md }}>
            YANA note ta conduite à partir du GPS, accéléromètre et gyroscope : anticipation,
            douceur des freinages, régularité d&apos;allure. Chaque trajet nourrit ton score SAFE
            mensuel et débloque des remises partenaires.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.semantic.success,
              fontSize: typography.body.sm,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Écoconduite
          </Text>
          <Text style={{ color: colors.dark.textPrimary, fontSize: typography.body.md }}>
            Conduire doucement dépollue. YANA calcule les kg CO₂ évités via le facteur ADEME, et
            transforme 10 kg évités en un arbre réellement planté chez Tree-Nation.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: fib.xs }}>
          <Text
            style={{
              color: colors.accent.tertiary,
              fontSize: typography.body.sm,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Prochaine étape
          </Text>
          <Text style={{ color: colors.dark.textSecondary, fontSize: typography.body.sm }}>
            Le tracking natif en direct (foreground + background task) arrive dans la prochaine
            version mobile. En attendant, tu peux démarrer un trajet depuis le site web — les
            données remontent dans ton dashboard dès la fin.
          </Text>
          <PrimaryButton
            testID="drive-open-web"
            label="Ouvrir sur yana.purama.dev"
            variant="secondary"
            onPress={openDriveOnWeb}
          />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  )
}
