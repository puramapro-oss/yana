// Catalogue des apps Purama sibling pour cross-promo depuis YANA
// Pertinence auto : YANA=mobilité+conscience → apps santé/bien-être/conscience

export interface SiblingApp {
  slug: string
  name: string
  tagline: string
  description: string
  emoji: string
  color: string
  url: string
  couponCode: string
  discountLabel: string
  relevance: 'high' | 'medium'
}

// Apps sibling pertinentes pour un user YANA (mobilité + conduite consciente).
// CLAUDE.md §Cross-Promo : -50% CROSS50, max 2 affichées par page, pertinence auto.
export const SIBLING_APPS: SiblingApp[] = [
  {
    slug: 'kaia',
    name: 'KAÏA',
    tagline: 'Ton médecin personnel IA',
    description: 'Analyse tes symptômes, dépiste la fatigue et veille sur ta santé sur la route.',
    emoji: '🩺',
    color: '#10B981',
    url: 'https://kaia.purama.dev',
    couponCode: 'CROSS50',
    discountLabel: '-50 % le 1er mois',
    relevance: 'high',
  },
  {
    slug: 'prana',
    name: 'PRANA',
    tagline: 'Coach respiration & énergie',
    description: 'Respiration guidée anti-stress avant, pendant et après tes trajets.',
    emoji: '🌬️',
    color: '#F472B6',
    url: 'https://prana.purama.dev',
    couponCode: 'CROSS50',
    discountLabel: '-50 % le 1er mois',
    relevance: 'high',
  },
  {
    slug: 'vida_sante',
    name: 'VIDA',
    tagline: 'Nutrition et sommeil',
    description: 'Repas, hydratation et récupération pour mieux conduire.',
    emoji: '🥗',
    color: '#10B981',
    url: 'https://vida.purama.dev',
    couponCode: 'CROSS50',
    discountLabel: '-50 % le 1er mois',
    relevance: 'medium',
  },
  {
    slug: 'exodus',
    name: 'EXODUS',
    tagline: 'Détox numérique',
    description: 'Détox écran avant de prendre la route, reprends conscience de ton temps.',
    emoji: '📵',
    color: '#22C55E',
    url: 'https://exodus.purama.dev',
    couponCode: 'CROSS50',
    discountLabel: '-50 % le 1er mois',
    relevance: 'medium',
  },
]

// Renvoie 2 apps adaptées à un slot donné (pseudo-random déterministe par user_id)
export function pickCrossPromoApps(userId: string, count: number = 2): SiblingApp[] {
  // High-relevance d'abord, medium ensuite
  const high = SIBLING_APPS.filter((a) => a.relevance === 'high')
  const medium = SIBLING_APPS.filter((a) => a.relevance === 'medium')

  // Pseudo-random stable : hash simple user_id → offset high apps
  const seed = userId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
  const highShuffled = [...high].sort((a, b) => ((seed + a.slug.length) % 7) - ((seed + b.slug.length) % 7))
  const mediumShuffled = [...medium].sort((a, b) => ((seed + a.slug.length * 2) % 7) - ((seed + b.slug.length * 2) % 7))

  const picked = [...highShuffled, ...mediumShuffled].slice(0, count)
  return picked
}
