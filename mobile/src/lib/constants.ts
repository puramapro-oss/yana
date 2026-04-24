/**
 * Constantes immuables de YANA Mobile.
 * Toute valeur modifiable par user = DB (profile, settings), pas ici.
 */

/** Slug de l'app dans l'écosystème Purama — utilisé pour API, deep links, schema DB. */
export const APP_SLUG = 'yana' as const

/** Bundle identifier iOS / Android — aligné §16 CLAUDE.md `dev.purama.{SLUG}`. */
export const BUNDLE_ID = 'dev.purama.yana' as const

/** URL canonique web YANA — utilisée pour universal links et fallback redirections. */
export const WEB_URL = 'https://yana.purama.dev' as const

/** Scheme deep link natif — `yana://` (ex: yana://activate, yana://trip/123). */
export const DEEP_LINK_SCHEME = 'yana' as const

/** Email super admin — accès God Mode admin panel (cohérent avec web). */
export const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com' as const

/** Montant minimum de retrait wallet (€) — identique web/mobile. */
export const WALLET_MIN_WITHDRAWAL_EUR = 5 as const

/** Modèles IA utilisés par YANA (copilote NAMA-PILOTE). */
export const AI_MODELS = {
  MAIN: 'claude-sonnet-4-6',
  FAST: 'claude-haiku-4-5-20251001',
  PRO: 'claude-opus-4-7',
} as const

/** Langues supportées par l'app (16, alignées messages/*.json web). */
export const SUPPORTED_LOCALES = [
  'fr', 'en', 'es', 'de', 'it', 'pt',
  'ar', 'zh', 'ja', 'ko', 'hi', 'ru',
  'tr', 'nl', 'pl', 'sv',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = 'fr'

/** Clés de storage SecureStore / AsyncStorage (namespacées pour éviter collisions). */
export const STORAGE_KEYS = {
  THEME: 'yana.theme',
  LOCALE: 'yana.locale',
  TUTORIAL_COMPLETED: 'yana.tutorial.completed',
  LAST_TRIP_ID: 'yana.trip.last',
  TRIP_EVENT_QUEUE: 'yana.queue.trip_events',
  PUSH_TOKEN: 'yana.push.token',
  NO_PHONE_WHILE_DRIVING: 'yana.settings.no_phone',
} as const

/** Nom de la TaskManager task pour tracking GPS background iOS+Android. */
export const BACKGROUND_LOCATION_TASK = 'YANA_TRIP_TRACK' as const
