import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs — YANA',
  description:
    'Free 1 scan/jour ou Premium 9.99€/mois (essai 14j) : scans illimités, démarches automatiques, alertes droits, retraits IBAN dès 5€. -30% en annuel.',
  alternates: { canonical: 'https://yana.purama.dev/pricing' },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
