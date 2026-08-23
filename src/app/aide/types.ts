export interface FaqArticle {
  id: string
  category: string
  question: string
  answer: string
  search_keywords: string[]
  view_count: number
  helpful_count: number
  priority: number
}

export interface FaqCategory {
  slug: string
  count: number
}

export type ActiveTab = 'faq' | 'chat'

export const CATEGORY_LABELS: Record<string, string> = {
  demarrage: 'Démarrage',
  'safety-score': 'Score de sécurité',
  graines: 'Graines 🌱',
  covoiturage: 'Covoiturage',
  'tree-planting': "Plantation d'arbres 🌳",
  kyc: "Vérification d'identité",
  fatigue: 'Fatigue & santé',
  moto: 'Mode Moto',
  'permis-points': 'Permis à points',
  assurance: 'Assurance',
  facturation: 'Abonnement & facturation',
  'retrait-wallet': 'Retraits & wallet',
  parrainage: 'Parrainage',
  'erreur-gps': 'Problèmes GPS',
  'suppression-compte': 'RGPD & suppression',
}

export function labelForCategory(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, ' ')
}

export function renderAnswer(md: string): string {
  // Rendu minimaliste : gras **x** → <strong>, retours ligne → <br>
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

export interface ChatResult {
  resolved: boolean
  answer?: string | null
  confidence?: number | null
  ticket_id?: string
}
