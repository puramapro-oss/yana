'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import { APP_NAME } from '@/lib/constants'

interface ReferralCardProps {
  link: string
  code: string
}

export default function ReferralCard({ link, code }: ReferralCardProps) {
  const [copied, setCopied] = useState(false)

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`${label} copié`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier — copie manuellement')
    }
  }

  async function share() {
    const shareData = {
      title: APP_NAME,
      text: `Rejoins ${APP_NAME}, le karma de la route. Je te parraine 🚗`,
      url: link,
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
      } catch {
        // user cancelled
      }
    } else {
      await copy(link, 'Lien')
    }
  }

  if (!link || !code) {
    return (
      <div className="glass rounded-2xl p-5 sm:p-6">
        <p className="text-sm text-[var(--text-muted)]">
          Ton code de parrainage se prépare. Rafraîchis la page dans quelques secondes.
        </p>
      </div>
    )
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--cyan)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-[var(--purple)]/10 blur-3xl" />

      <div className="relative">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Ton code personnel</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-wider text-[var(--text-primary)] sm:text-5xl">
          {code}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-[var(--text-secondary)]">
            <span className="truncate" title={link}>{link}</span>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => copy(link, 'Lien')}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
            data-testid="copy-referral-link"
          >
            {copied ? 'Copié' : 'Copier'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={share}
            icon={<Share2 size={16} />}
            data-testid="share-referral-link"
          >
            Partager
          </Button>
        </div>

        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Chaque filleul qui s&apos;abonne te rapporte <strong className="text-[var(--text-primary)]">50 % du premier paiement</strong>{' '}
          + <strong className="text-[var(--text-primary)]">10 % à vie</strong>. Niveau 2 : 15 %. Niveau 3 : 5 %.
        </p>
      </div>
    </div>
  )
}
