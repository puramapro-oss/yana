import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('common.poetic')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-[family-name:var(--font-display)] text-6xl font-bold gradient-text">404</h1>
      <p className="max-w-md text-center text-[var(--text-secondary)]">{t('empty')}</p>
      <Link
        href="/"
        className="rounded-xl bg-[var(--cyan)]/10 px-6 py-3 text-[var(--cyan)] transition hover:bg-[var(--cyan)]/20"
      >
        {t('welcome')}
      </Link>
    </div>
  )
}
