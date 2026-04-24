'use client'

import { useTranslations } from 'next-intl'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common.poetic')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--pink)]">
        {t('error')}
      </h1>
      <p className="max-w-md text-center text-[var(--text-secondary)]">
        {error.message || t('error')}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-[var(--cyan)]/10 px-6 py-3 text-[var(--cyan)] transition hover:bg-[var(--cyan)]/20"
      >
        {t('retry')}
      </button>
    </div>
  )
}
