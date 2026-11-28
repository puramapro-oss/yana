import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import CarpoolReceipt from './CarpoolReceipt'
import type { SafeWalkContact } from '../types'
import type { Carpool } from '@/types'

interface BookingModalProps {
  open: boolean
  onClose: () => void
  carpool: Carpool
  seats: number
  estimatedSeeds?: number
  onSeatsChange: (n: number) => void
  contacts: SafeWalkContact[]
  onContactsChange: (contacts: SafeWalkContact[]) => void
  onBook: () => void
  busy: boolean
}

export default function BookingModal({
  open,
  onClose,
  carpool,
  seats,
  estimatedSeeds,
  onSeatsChange,
  contacts,
  onContactsChange,
  onBook,
  busy,
}: BookingModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Réserver ce trajet"
      className="max-w-md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onBook()
        }}
        className="flex flex-col gap-4"
      >
        <Input
          id="book-seats"
          type="number"
          label="Nombre de places"
          min={1}
          max={carpool.seats_remaining}
          value={seats}
          onChange={(e) => {
            const n = Math.max(1, Math.min(carpool.seats_remaining, Number(e.target.value)))
            onSeatsChange(n)
          }}
          required
        />

        <div>
          <p className="text-sm text-[var(--text-secondary)]">Safe Walk · jusqu&apos;à 3 contacts</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Optionnel. Ces personnes pourront suivre ta position le jour J.
          </p>
          <div className="mt-3 space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => {
                    const next = [...contacts]
                    next[i] = { ...c, name: e.target.value }
                    onContactsChange(next)
                  }}
                  placeholder="Prénom"
                  className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  maxLength={100}
                />
                <input
                  type="tel"
                  value={c.phone}
                  onChange={(e) => {
                    const next = [...contacts]
                    next[i] = { ...c, phone: e.target.value }
                    onContactsChange(next)
                  }}
                  placeholder="+33…"
                  className="rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  maxLength={30}
                />
                {contacts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onContactsChange(contacts.filter((_, j) => j !== i))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Retirer ce contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {contacts.length < 3 && (
              <button
                type="button"
                onClick={() => onContactsChange([...contacts, { name: '', phone: '' }])}
                className="text-xs text-[var(--cyan)] underline hover:no-underline"
              >
                + Ajouter un contact
              </button>
            )}
          </div>
        </div>

        <CarpoolReceipt totalCents={carpool.price_per_seat_cents * seats} />
        <p className="text-xs text-[var(--text-muted)]">
          Les Graines sont des points PURAMA.{' '}
          {estimatedSeeds != null && <>Estimation pour ta formule actuelle · {estimatedSeeds} Graines pour cette réservation.{' '}</>}
          Le nombre de points crédités sera affiché après les deux confirmations.{' '}
          <Link href="/cgv" className="underline">Conditions</Link>
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={busy} data-testid="carpool-book-confirm">
            Confirmer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
