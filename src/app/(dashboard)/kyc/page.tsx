'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShieldCheck, Clock, ShieldAlert, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useKyc } from '@/hooks/useKyc'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export default function KycPage() {
  const { user, profile } = useAuth()
  const { verification, status, loading, error, start, simulateApprove, refetch } = useKyc()
  const [busy, setBusy] = useState(false)

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || profile?.role === 'super_admin'
  const effectiveStatus = profile?.onfido_status === 'approved' ? 'approved' : status

  async function handleStart() {
    if (busy) return
    setBusy(true)
    const { error: errMsg, fallback_reason } = await start()
    setBusy(false)
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    if (fallback_reason) {
      toast.info(fallback_reason)
    } else {
      toast.success('Vérification démarrée.')
    }
  }

  async function handleSimulate() {
    if (busy) return
    setBusy(true)
    const { error: errMsg } = await simulateApprove()
    setBusy(false)
    if (errMsg) toast.error(errMsg)
    else toast.success('KYC simulé — tu peux tester le flow covoiturage ✅')
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          Vérification d&apos;identité
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          On vérifie une seule fois, puis tu réserves ou proposes des covoiturages en toute confiance.
        </p>
      </header>

      {loading ? (
        <div className="glass-card-static p-6">
          <div className="h-6 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-white/5" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              {error}{' '}
              <button onClick={refetch} className="underline hover:no-underline">
                Réessayer
              </button>
            </div>
          )}

          <StatusCard status={effectiveStatus} verification={verification} />

          <div className="mt-4 flex flex-col gap-2">
            {effectiveStatus === 'none' && (
              <Button onClick={handleStart} loading={busy} variant="primary" className="w-full">
                Démarrer la vérification
              </Button>
            )}
            {effectiveStatus === 'pending' && (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
                Onfido sera activé très bientôt. Tu n&apos;as rien à faire — tu seras notifié dès que tu pourras finaliser ta vérification.
              </p>
            )}
            {effectiveStatus === 'rejected' && (
              <Button onClick={handleStart} loading={busy} variant="secondary" className="w-full">
                Relancer une vérification
              </Button>
            )}
            {effectiveStatus === 'approved' && (
              <Link
                href="/carpool"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--cyan)]/20 transition hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" />
                Explorer le covoiturage
              </Link>
            )}
          </div>

          {isSuperAdmin && effectiveStatus !== 'approved' && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Super admin · mode test
              </p>
              <p className="mt-1 text-sm text-amber-100">
                Onfido n&apos;est pas encore branché en prod. Simule une approbation pour tester le flow covoiturage end-to-end.
              </p>
              <Button
                onClick={handleSimulate}
                loading={busy}
                variant="ghost"
                size="sm"
                className="mt-3"
              >
                Simuler KYC approved
              </Button>
            </div>
          )}

          <section className="mt-8 space-y-3 text-xs text-[var(--text-muted)]">
            <p>✓ Document d&apos;identité (CNI ou passeport)</p>
            <p>✓ Selfie vidéo avec mouvements (anti-deepfake)</p>
            <p>✓ 2 minutes chrono</p>
            <p>✓ 100 % chiffré · partenaire européen certifié</p>
          </section>
        </>
      )}
    </div>
  )
}

function StatusCard({
  status,
  verification,
}: {
  status: string
  verification: { completed_at?: string | null } | null
}) {
  const icon = {
    approved: <ShieldCheck className="h-6 w-6" />,
    pending: <Clock className="h-6 w-6" />,
    processing: <Clock className="h-6 w-6" />,
    rejected: <ShieldAlert className="h-6 w-6" />,
    expired: <ShieldAlert className="h-6 w-6" />,
    none: <ShieldAlert className="h-6 w-6" />,
  }[status] ?? <ShieldAlert className="h-6 w-6" />

  const label = {
    approved: 'Identité vérifiée ✓',
    pending: 'Vérification en attente',
    processing: 'Vérification en cours',
    rejected: 'Vérification refusée',
    expired: 'Vérification expirée',
    none: 'Pas encore vérifié',
  }[status] ?? 'Statut inconnu'

  const sublabel = {
    approved: verification?.completed_at
      ? `Validée le ${new Date(verification.completed_at).toLocaleDateString('fr-FR')}`
      : 'Tu peux réserver ou proposer des covoiturages.',
    pending: 'Ton dossier est dans la file. Aucune action requise.',
    processing: 'Nos partenaires analysent ta vérification.',
    rejected: 'Relance une nouvelle vérification avec un document plus net.',
    expired: 'Ta vérification a expiré — relance-la.',
    none: 'Lance la vérification pour débloquer le covoiturage.',
  }[status] ?? ''

  const tone = {
    approved: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    pending: 'border-amber-500/30 bg-amber-500/5 text-amber-200',
    processing: 'border-sky-500/30 bg-sky-500/5 text-sky-200',
    rejected: 'border-red-500/30 bg-red-500/5 text-red-200',
    expired: 'border-red-500/30 bg-red-500/5 text-red-200',
    none: 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)]',
  }[status] ?? 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)]'

  return (
    <div className={`flex items-start gap-4 rounded-2xl border p-5 ${tone}`} data-testid="kyc-status-card">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{sublabel}</p>
      </div>
    </div>
  )
}
