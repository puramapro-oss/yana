import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '@/lib/theme'

/**
 * Tabs bottom × 5 — cohérentes avec src/components/layout/BottomTabBar.tsx web.
 * Ordre : Dashboard (home) · Drive (start trip) · Carpool · Wallet · Profile.
 *
 * Note : on utilise des glyphes Unicode simples pour A4 — remplaçables par
 * lucide-react-native en A5/A6 quand le design polish l'exigera. Les glyphes
 * sont choisis pour exister sur iOS (SF) et Android (Roboto/Noto) sans fallback.
 */
type IconProps = { focused: boolean; color: string }

function makeIcon(glyph: string): (props: IconProps) => React.ReactElement {
  return ({ focused, color }) => (
    <Text
      style={{
        fontSize: 22,
        color,
        opacity: focused ? 1 : 0.65,
      }}
    >
      {glyph}
    </Text>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.dark.bgDeep,
          borderTopColor: colors.dark.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.dark.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: makeIcon('⌂'),
          tabBarButtonTestID: 'tab-dashboard',
        }}
      />
      <Tabs.Screen
        name="drive"
        options={{
          title: 'Conduire',
          tabBarIcon: makeIcon('⚡'),
          tabBarButtonTestID: 'tab-drive',
        }}
      />
      <Tabs.Screen
        name="carpool"
        options={{
          title: 'Covoiturage',
          tabBarIcon: makeIcon('◍'),
          tabBarButtonTestID: 'tab-carpool',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: makeIcon('€'),
          tabBarButtonTestID: 'tab-wallet',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: makeIcon('☉'),
          tabBarButtonTestID: 'tab-profile',
        }}
      />
    </Tabs>
  )
}
