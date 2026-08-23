export type PrefType = 'daily' | 'achievement' | 'referral' | 'wallet' | 'contest' | 'lottery'
export type Frequency = 'low' | 'normal' | 'high'

export interface Preference {
  type: PrefType
  enabled: boolean
  days_of_week: number[]
  hour_start: number
  hour_end: number
  frequency: Frequency
  paused_until: string | null
}

export const TYPE_LABELS: Record<PrefType, { label: string; desc: string }> = {
  daily:       { label: 'Rappel quotidien',  desc: 'Message personnalisé selon ton engagement.' },
  achievement: { label: 'Achievements',      desc: 'Quand tu débloques un badge.' },
  referral:    { label: 'Parrainage',        desc: 'Nouvel inscrit filleul, palier atteint.' },
  wallet:      { label: 'Wallet',            desc: 'Crédits, retraits, virements SEPA.' },
  contest:     { label: 'Classement hebdo',  desc: 'Gain hebdo, approche du podium.' },
  lottery:     { label: 'Tirage mensuel',    desc: 'Ticket gagnant, prochain tirage.' },
}

export const DAYS = [
  { idx: 1, label: 'L' },
  { idx: 2, label: 'M' },
  { idx: 3, label: 'M' },
  { idx: 4, label: 'J' },
  { idx: 5, label: 'V' },
  { idx: 6, label: 'S' },
  { idx: 0, label: 'D' },
]
