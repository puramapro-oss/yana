import { Check, CheckCircle2, Copy } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { RedeemResult } from '../types'

interface RedeemSuccessModalProps {
  result: RedeemResult | null
  couponCopied: boolean
  onClose: () => void
  onCopyCoupon: (code: string) => void
}

export default function RedeemSuccessModal({
  result,
  couponCopied,
  onClose,
  onCopyCoupon,
}: RedeemSuccessModalProps) {
  if (!result) return null

  return (
    <Modal open={result !== null} onClose={onClose} title="Échange réussi">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
            {result.itemName}
          </p>
        </div>

        {result.couponCode && (
          <div className="rounded-xl border border-[var(--cyan)]/30 bg-[var(--cyan)]/5 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Ton code</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-widest text-[var(--cyan)]">
              {result.couponCode}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCopyCoupon(result.couponCode as string)}
              icon={couponCopied ? <Check size={14} /> : <Copy size={14} />}
              className="mt-3"
            >
              {couponCopied ? 'Copié' : 'Copier le code'}
            </Button>
          </div>
        )}

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Nouveau solde :{' '}
          <strong className="text-[var(--text-primary)]">
            {result.balance.toLocaleString('fr-FR')} pts
          </strong>
        </p>

        <Button variant="primary" size="md" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  )
}
