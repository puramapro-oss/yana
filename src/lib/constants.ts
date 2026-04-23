// YANA — PURAMA Mobility Wellness (schema yana)
// Sanskrit यान = véhicule / voyage. Le KARMA de la route.

export const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com'

export const APP_NAME = 'YANA'
export const APP_SHORT_NAME = 'YANA'
export const APP_SLUG = 'yana'
export const APP_DOMAIN = 'yana.purama.dev'
export const APP_URL = 'https://yana.purama.dev'
export const APP_COLOR = '#F97316'             // orange route — mouvement, feu, signalisation
export const APP_COLOR_SECONDARY = '#0EA5E9'   // bleu voyage — ciel, sérénité
export const APP_COLOR_AWAKENING = '#7C3AED'   // violet éveil — pulse NAMA, ADN Purama
export const APP_SCHEMA = 'yana'
export const AI_NAME = 'NAMA-PILOTE'
export const BUNDLE_ID = 'dev.purama.yana'

// Tagline & promesse
export const APP_TAGLINE = 'Le karma de la route'
export const APP_PROMISE = "Conduis avec la sérénité d'un moine zen. Arrive vivant, détendu, plus riche."

export const COMPANY_INFO = {
  name: 'SASU PURAMA',
  address: '8 Rue de la Chapelle, 25560 Frasne',
  country: 'France',
  taxNote: 'TVA non applicable, art. 293 B du CGI',
  dpo: 'matiss.frasne@gmail.com',
  association: 'Association PURAMA (loi 1901)',
  founder: 'Matiss Dornier',
}

// ──────────────────────────────────────────────────────────────────
// Plans VITAE §20 — 3 plans fixes identiques partout dans l'écosystème
// Essentiel 9,99€ (×1) · Infini 49,99€ (×5) · Legende 99,99€ (×10)
// Essai 14 jours sur tous les plans payants.
// ──────────────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id: 'free',
    label: 'Découverte',
    price_monthly: 0,
    price_yearly: 0,
    multiplier: 1,
    features: [
      'Tracking de trajets illimité (score safety + eco)',
      "CO₂ temps réel & plantation d'arbres auto",
      'Covoiturage limité (1/mois)',
      'NAMA-PILOTE chat (3 messages/jour)',
      'Points PURAMA uniquement (€ réels verrouillés)',
    ],
  },
  essentiel: {
    id: 'essentiel',
    label: 'Essentiel',
    price_monthly: 999,       // 9,99€
    price_yearly: 7999,       // 79,99€ soit -33%
    multiplier: 1,
    trial_days: 14,
    features: [
      '14 jours d’essai gratuit',
      'Tracking trajets illimité · score safety + eco + CO₂',
      'Covoiturage Dual Reward illimité',
      'NAMA-PILOTE chat (20 messages/jour)',
      'Multiplicateur gains ×1',
      'Wallet € retrait IBAN dès 5€',
      '1 arbre planté par tranche de 10 kg CO₂ compensés',
    ],
  },
  infini: {
    id: 'infini',
    label: 'Infini',
    price_monthly: 4999,      // 49,99€
    price_yearly: 39999,      // 399,99€ soit -33%
    multiplier: 5,
    trial_days: 14,
    features: [
      'Tout Essentiel',
      'Multiplicateur gains ×5 sur chaque mission, trajet, concours',
      'NAMA-PILOTE chat illimité',
      'Multi-véhicules (illimité)',
      'Mode Moto premium · équipement photo AI',
      'Priorité covoiturage (match avant tout le monde)',
    ],
    popular: true,
  },
  legende: {
    id: 'legende',
    label: 'Legende',
    price_monthly: 9999,      // 99,99€
    price_yearly: 79999,      // 799,99€ soit -33%
    multiplier: 10,
    trial_days: 14,
    features: [
      'Tout Infini',
      'Multiplicateur gains ×10',
      'Concierge NAMA 24/7 (voix personnalisée)',
      'Safe Driver Badge certifié — éligible remises assurances partenaires',
      '10 arbres plantés / mois automatiques',
      'Accès Ange Gardien & Ordonnance Verte',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

// ──────────────────────────────────────────────────────────────────
// Economics VITAE — split 50/10/40 (§35.1) + 1 Graine = 0,01€ (§35)
// ──────────────────────────────────────────────────────────────────
export const SPLIT_POOL_USERS = 50   // 50% aux users (prix jeux + pools)
export const SPLIT_POOL_ASSO = 10    // 10% Association PURAMA
export const SPLIT_POOL_SASU = 40    // 40% SASU PURAMA
export const SEEDS_TO_EUR = 0.01     // 1 Graine = 0,01€
export const WALLET_MIN_WITHDRAWAL = 5 // euros — anti-double-retrait LEARNINGS #24
export const SUBSCRIPTION_WITHDRAW_LOCK_DAYS = 30 // L221-28 §21

// Anti-fraude : limites free/paid
export const CHAT_DAILY_LIMIT_FREE = 3
export const CHAT_DAILY_LIMIT_ESSENTIEL = 20
export const CARPOOL_MONTHLY_LIMIT_FREE = 1

// ──────────────────────────────────────────────────────────────────
// Niveaux Sanskrit (cross-apps PURAMA wellness — voir KARMA §13)
// Basés sur seeds_balance accumulé
// ──────────────────────────────────────────────────────────────────
export const SANSKRIT_LEVELS = [
  { id: 1, slug: 'novice', name: 'Novice', min: 0, max: 100, emoji: '🌱', color: '#86efac' },
  { id: 2, slug: 'sadhaka', name: 'Sadhaka', min: 101, max: 1000, emoji: '🧘', color: '#4ade80' },
  { id: 3, slug: 'yogin', name: 'Yogin', min: 1001, max: 10000, emoji: '✨', color: '#10b981' },
  { id: 4, slug: 'siddha', name: 'Siddha', min: 10001, max: 100000, emoji: '💎', color: '#0EA5E9' },
  { id: 5, slug: 'mahatma', name: 'Mahatma', min: 100001, max: 999999, emoji: '🕉️', color: '#7C3AED' },
  { id: 6, slug: 'libere', name: 'Libéré', min: 1000000, max: Number.MAX_SAFE_INTEGER, emoji: '☸️', color: '#F59E0B' },
] as const

export type SanskritLevelSlug = typeof SANSKRIT_LEVELS[number]['slug']

// ──────────────────────────────────────────────────────────────────
// Types de véhicules YANA
// ──────────────────────────────────────────────────────────────────
export const VEHICLE_TYPES = [
  { id: 'car', name: 'Voiture', icon: '🚗', allowedFuels: ['petrol', 'diesel', 'electric', 'hybrid', 'plugin_hybrid', 'lpg'] },
  { id: 'moto', name: 'Moto', icon: '🏍️', allowedFuels: ['petrol', 'electric'] },
  { id: 'scooter', name: 'Scooter', icon: '🛵', allowedFuels: ['petrol', 'electric'] },
  { id: 'ev_car', name: 'Voiture électrique', icon: '⚡', allowedFuels: ['electric'] },
  { id: 'ev_moto', name: 'Moto électrique', icon: '🔋', allowedFuels: ['electric'] },
  { id: 'hybrid', name: 'Hybride', icon: '♻️', allowedFuels: ['hybrid', 'plugin_hybrid'] },
] as const

export const FUEL_TYPES = [
  { id: 'petrol', name: 'Essence', icon: '⛽' },
  { id: 'diesel', name: 'Diesel', icon: '🛢️' },
  { id: 'electric', name: 'Électrique', icon: '⚡' },
  { id: 'hybrid', name: 'Hybride', icon: '♻️' },
  { id: 'plugin_hybrid', name: 'Hybride rechargeable', icon: '🔌' },
  { id: 'lpg', name: 'GPL', icon: '🫧' },
] as const

// ──────────────────────────────────────────────────────────────────
// Event types trajets (scoring safety)
// ──────────────────────────────────────────────────────────────────
export const TRIP_EVENT_WEIGHTS = {
  harsh_brake: -3,
  harsh_accel: -2,
  sharp_turn: -2,
  speeding: -5,
  phone_use: -10,
  fatigue_signal: -4,
  break_missed: -3,
  focus_maintained: +2,
  smooth_drive: +1,
  eco_acceleration: +1,
} as const

export const SAFETY_BADGES = [
  { id: 'gold', min: 90, label: 'Or', emoji: '🥇', color: '#F59E0B' },
  { id: 'silver', min: 75, label: 'Argent', emoji: '🥈', color: '#9CA3AF' },
  { id: 'bronze', min: 60, label: 'Bronze', emoji: '🥉', color: '#B45309' },
  { id: 'learner', min: 0, label: 'Apprenti', emoji: '🎓', color: '#6B7280' },
] as const

// ──────────────────────────────────────────────────────────────────
// Parrainage (§CLAUDE.md parrainage + KARMA §13)
// ──────────────────────────────────────────────────────────────────
export const REFERRAL = {
  referrer_first_percent: 50,   // 50% du premier paiement
  referrer_lifetime_percent: 10, // 10% à vie
  referred_first_month_discount: 50, // -50% premier mois filleul
  cross_app_percent: 5,
  level_bonus_x2: true,
} as const

// ──────────────────────────────────────────────────────────────────
// Ambassadeur (§VEDA rename influenceur → ambassadeur)
// ──────────────────────────────────────────────────────────────────
export const AMBASSADOR_TIERS = [
  { slug: 'bronze', label: 'Bronze', min_referrals: 10, commission_pct: 10 },
  { slug: 'argent', label: 'Argent', min_referrals: 25, commission_pct: 11 },
  { slug: 'or', label: 'Or', min_referrals: 50, commission_pct: 12 },
  { slug: 'platine', label: 'Platine', min_referrals: 100, commission_pct: 13 },
  { slug: 'diamant', label: 'Diamant', min_referrals: 250, commission_pct: 15 },
  { slug: 'legende', label: 'Légende', min_referrals: 500, commission_pct: 17 },
  { slug: 'titan', label: 'Titan', min_referrals: 5000, commission_pct: 20 },
  { slug: 'eternel', label: 'Éternel', min_referrals: 10000, commission_pct: 25 },
] as const

export type AmbassadorTierSlug = typeof AMBASSADOR_TIERS[number]['slug']

// ──────────────────────────────────────────────────────────────────
// Rôles
// ──────────────────────────────────────────────────────────────────
export const ROLES = {
  user: 'user',
  ambassadeur: 'ambassadeur',
  super_admin: 'super_admin',
} as const

// ──────────────────────────────────────────────────────────────────
// Routes publiques middleware (§10 CLAUDE.md + PWA LEARNINGS)
// ──────────────────────────────────────────────────────────────────
export const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/how-it-works',
  '/ecosystem',
  '/status',
  '/changelog',
  '/privacy',
  '/terms',
  '/legal',
  '/offline',
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/mentions-legales',
  '/politique-confidentialite',
  '/cgv',
  '/cgu',
  '/cookies',
  '/aide',
  '/contact',
  '/accessibilite',
  '/subscribe',
  '/confirmation',
  '/financer',
]

// ──────────────────────────────────────────────────────────────────
// Modèles IA (§22 — via process.env, JAMAIS hardcoder)
// ──────────────────────────────────────────────────────────────────
export const AI_MODEL_FALLBACKS = {
  main: 'claude-sonnet-4-6',
  fast: 'claude-haiku-4-5-20251001',
  pro: 'claude-opus-4-7',
} as const
