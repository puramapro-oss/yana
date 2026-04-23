import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion — YANA',
  description:
    'Connecte-toi à YANA : scanner financier, démarches automatiques, wallet IBAN, alertes droits. Email ou Google, session 30 jours.',
  alternates: { canonical: 'https://yana.purama.dev/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
