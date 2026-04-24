/**
 * Tokens de design YANA — synchronisés avec src/app/globals.css web.
 * Palette : #F97316 (orange route) + #0EA5E9 (bleu voyage) + #7C3AED (éveil NAMA).
 *
 * Pas de contexte React ici — on expose les valeurs brutes pour que
 * les composants stylent via Tailwind (A5) ou directement via StyleSheet.
 */

export const colors = {
  dark: {
    bgVoid: '#03040a',
    bgDeep: '#04120c',
    bgNebula: '#080b16',
    bgCard: 'rgba(255,255,255,0.025)',
    bgCardHover: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.06)',
    borderGlow: 'rgba(0,212,255,0.3)',
    textPrimary: '#f0f2ff',
    textSecondary: 'rgba(255,255,255,0.72)',
    textMuted: 'rgba(255,255,255,0.58)',
  },
  light: {
    bgVoid: '#f8fafc',
    bgDeep: '#ffffff',
    bgNebula: '#eef2f7',
    bgCard: 'rgba(0,0,0,0.025)',
    bgCardHover: 'rgba(0,0,0,0.05)',
    border: 'rgba(15,23,42,0.08)',
    borderGlow: 'rgba(8,145,178,0.35)',
    textPrimary: '#0f172a',
    textSecondary: 'rgba(15,23,42,0.65)',
    textMuted: 'rgba(15,23,42,0.45)',
  },
  /** Accents identiques dans tous les thèmes (cohérence marque). */
  accent: {
    primary: '#F97316',    // orange route
    secondary: '#0EA5E9',  // bleu voyage
    tertiary: '#7C3AED',   // violet éveil NAMA
  },
  /** Couleurs sémantiques (mêmes sur dark/light, ajustées par opacité si besoin). */
  semantic: {
    cyan: '#00d4ff',
    pink: '#ff6b9d',
    green: '#39ff14',
    gold: '#ffd700',
    purple: '#a855f7',
    orange: '#ff6b35',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
  },
} as const

/** Radii — cohérents web. */
export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
} as const

/** Ratios dorés Fibonacci — portés de P6.C4 (web globals.css --fib-*). */
export const fib = {
  xs: 8,
  sm: 13,
  md: 21,
  lg: 34,
  xl: 55,
  xxl: 89,
} as const

/** Ratio phi pour aspect-ratio. */
export const phi = 1.618 as const

/** Spring preset cohérence cardiaque (framer-motion web → reanimated mobile). */
export const spring = {
  damping: 30,
  stiffness: 300,
  mass: 1,
} as const

/** Typography scale. */
export const typography = {
  display: {
    family: 'System', // iOS = SF Pro, Android = Roboto — fonts custom en A6 via expo-font
    xl: 48,
    lg: 36,
    md: 28,
    sm: 22,
  },
  body: {
    family: 'System',
    lg: 18,
    md: 16,
    sm: 14,
    xs: 12,
  },
  /** Tailles "Moto Mode" — bouton/texte XXL pour lecture 1 coup d'œil casque. */
  moto: {
    button: 28,
    label: 22,
  },
} as const

/** Type union pour theme actif. */
export type ThemeMode = 'dark' | 'light' | 'oled'

/** Résolution de palette selon le thème. `oled` = dark avec BG pur noir. */
export function resolveColors(mode: ThemeMode) {
  if (mode === 'light') return colors.light
  if (mode === 'oled') {
    return {
      ...colors.dark,
      bgVoid: '#000000',
      bgDeep: '#000000',
      bgNebula: '#050508',
      bgCard: 'rgba(255,255,255,0.03)',
      bgCardHover: 'rgba(255,255,255,0.06)',
      textSecondary: 'rgba(255,255,255,0.78)',
      textMuted: 'rgba(255,255,255,0.55)',
      border: 'rgba(255,255,255,0.08)',
      borderGlow: 'rgba(0,212,255,0.4)',
    }
  }
  return colors.dark
}
