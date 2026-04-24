import { getTranslations } from 'next-intl/server'
import SubliminalLoader from '@/components/shared/SubliminalLoader'

/**
 * Loading UI du segment dashboard. Next.js App Router fire ce composant
 * pendant les transitions de route initiales vers /(dashboard)/*.
 * Le SubliminalLoader s'affiche après 2s (si la transition dépasse 2s).
 * P6.C4 : titre poétique "Ton espace se prépare" (common.poetic.loading).
 */
export default async function DashboardLoading() {
  const t = await getTranslations('common.poetic')
  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-5xl flex-col gap-4 p-4">
      <SubliminalLoader active />
      <p className="text-center text-sm text-[var(--text-muted)]">{t('loading')}</p>
      <div className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-white/[0.03]" />
        <div className="h-48 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />
    </div>
  )
}
