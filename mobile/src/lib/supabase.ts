import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { createClient, type SupportedStorage } from '@supabase/supabase-js'
import Constants from 'expo-constants'

/**
 * Adapter de stockage cross-platform pour @supabase/supabase-js.
 *
 * iOS / Android → expo-secure-store (Keychain / EncryptedSharedPreferences)
 *                 Chiffrement hardware-backed, survit aux redémarrages.
 * Web          → localStorage (fallback Expo web preview)
 *
 * Contrat SupportedStorage : { getItem, setItem, removeItem } — tous string|null|void.
 * Noms de clés ≤ 2KB (limite Keychain iOS). Supabase respecte cette limite.
 */
const secureStorageAdapter: SupportedStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    }
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value)
      }
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key)
      }
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}

/**
 * Résolution des env vars avec fallback sur app.json > extra (lecture via Constants).
 * - En dev Expo Go : process.env lit depuis .env.local (EXPO_PUBLIC_*)
 * - En build EAS    : les variables sont gelées dans Constants.expoConfig.extra
 */
type ExpoExtra = { supabaseUrl?: string; supabaseAnonKey?: string; appSlug?: string }
const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[YANA mobile] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY manquant — vérifier mobile/.env.local ou app.json > extra.",
  )
}

/**
 * Client Supabase unique pour l'app mobile YANA.
 * - storage = SecureStore (natif) / localStorage (web)
 * - autoRefreshToken = true (refresh silencieux avant expiration)
 * - persistSession = true (survit redémarrage)
 * - detectSessionInUrl = true sur web UNIQUEMENT (OAuth callback hash),
 *   false sur natif (deep link yana:// traité par app/(auth)/callback.tsx en A3)
 */
import { APP_SLUG } from '@/lib/constants'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  // Schema `yana` par défaut — cohérent avec src/lib/supabase.ts (web).
  // Permet `.from('profiles')` au lieu de `.from('yana.profiles')`.
  db: { schema: APP_SLUG },
})
