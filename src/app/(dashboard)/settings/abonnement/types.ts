import type { PlanId } from '@/lib/constants'

export interface Payment {
  id: string
  amount_cents: number
  currency: string
  status: string
  created_at: string
  stripe_invoice_id: string | null
}

export interface Invoice {
  id: string
  number: string
  amount_cents: number
  pdf_url: string | null
  issued_at: string
}

export interface SubscriptionResponse {
  plan: PlanId
  hasStripeCustomer: boolean
  hasActiveSubscription: boolean
  payments: Payment[]
  invoices: Invoice[]
}

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  succeeded: { label: 'Payé', className: 'bg-emerald-500/10 text-emerald-300' },
  pending: { label: 'En attente', className: 'bg-yellow-500/10 text-yellow-300' },
  failed: { label: 'Échec', className: 'bg-red-500/10 text-red-300' },
  refunded: { label: 'Remboursé', className: 'bg-white/5 text-[var(--text-muted)]' },
}
