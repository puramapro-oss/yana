'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'

interface WithdrawModalProps {
  open: boolean
  onClose: () => void
  balanceCents: number
  minWithdrawalCents: number
  onSuccess: (newBalanceCents: number) => void
}

function parseAmountToCents(input: string): number | null {
  const sanitized = input.replace(/\s+/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) return null
  const value = parseFloat(sanitized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}

export default function WithdrawModal({
  open,
  onClose,
  balanceCents,
  minWithdrawalCents,
  onSuccess,
}: WithdrawModalProps) {
  const [amountInput, setAmountInput] = useState('')
  const [iban, setIban] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) {
      setAmountInput('')
      setIban('')
      setError(null)
      setSuccess(false)
      setLoading(false)
    }
  }, [open])

  const amountCents = parseAmountToCents(amountInput)
  const amountValid = amountCents !== null && amountCents >= minWithdrawalCents && amountCents <= balanceCents
  const ibanTrimmed = iban.replace(/\s+/g, '')
  const ibanValidFormat = /^[A-Za-z]{2}[0-9A-Za-z]{13,32}$/.test(ibanTrimmed)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!amountCents || amountCents < minWithdrawalCents) {
      setError(`Le montant minimum est de ${formatPrice(minWithdrawalCents)}.`)
      return
    }
    if (amountCents > balanceCents) {
      setError('Solde insuffisant pour ce montant.')
      return
    }
    if (!ibanValidFormat) {
      setError('IBAN invalide. Vérifie le format.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, iban: ibanTrimmed }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Une erreur est survenue. Réessaie.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess(data.newBalanceCents)
        onClose()
      }, 1600)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title="Demander un retrait">
      {success ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
            Demande envoyée
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Ton retrait sera traité sous 3 à 5 jours ouvrés.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Solde disponible</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
              {formatPrice(balanceCents)}
            </p>
          </div>

          <Input
            label="Montant (€)"
            id="withdraw-amount"
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder={`Min. ${(minWithdrawalCents / 100).toFixed(2)}`}
            autoComplete="off"
            disabled={loading}
            data-testid="withdraw-amount"
          />

          <Input
            label="IBAN"
            id="withdraw-iban"
            type="text"
            inputMode="text"
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
            data-testid="withdraw-iban"
          />

          <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--text-muted)]">
            Seul le début et la fin de ton IBAN sont conservés. Le reste est haché pour vérification.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={!amountValid || !ibanValidFormat || loading}
              data-testid="submit-withdraw"
            >
              Confirmer le retrait
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
