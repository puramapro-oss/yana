'use client'

import { Moon, Sun, Zap } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

const LABEL: Record<string, string> = {
  dark: 'Sombre',
  light: 'Clair',
  oled: 'OLED',
}

export default function ThemeToggle({
  compact = false,
}: {
  compact?: boolean
}) {
  const { theme, cycleTheme, hydrated } = useTheme()

  if (!hydrated) {
    // Placeholder matching la future taille pour éviter un layout shift après
    // hydration. Même dimensions que le bouton compact/normal.
    return (
      <span
        aria-hidden
        className={
          compact
            ? 'inline-block h-8 w-8 rounded-full border border-[var(--border)] bg-white/[0.02]'
            : 'inline-block h-9 w-28 rounded-full border border-[var(--border)] bg-white/[0.02]'
        }
      />
    )
  }

  const Icon = theme === 'light' ? Sun : theme === 'oled' ? Zap : Moon

  if (compact) {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={`Thème actuel : ${LABEL[theme] ?? 'Sombre'}. Cliquer pour changer.`}
        data-testid="theme-toggle-compact"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--cyan)]/40 hover:text-[var(--text-primary)] transition-colors"
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Thème actuel : ${LABEL[theme] ?? 'Sombre'}. Cliquer pour changer.`}
      data-testid="theme-toggle"
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--cyan)]/40 hover:text-[var(--text-primary)] transition-colors"
    >
      <Icon className="h-4 w-4" />
      {LABEL[theme] ?? 'Sombre'}
    </button>
  )
}
