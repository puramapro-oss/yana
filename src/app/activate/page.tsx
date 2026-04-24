import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Activer YANA',
  description: 'Retour après abonnement — YANA relance ton app si tu l\'as installée.',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * /activate — landing post-Stripe pour l'app mobile.
 *
 * Scénario :
 *  1. L'utilisateur paie depuis l'app iOS (bouton "Débloquer mes gains" →
 *     ouvre https://yana.purama.dev/subscribe?app=yana&user=X&return=yana://activate)
 *  2. Stripe redirige vers https://yana.purama.dev/activate?session_id=cs_… après succès
 *  3. Si l'app est installée : iOS/Android lit apple-app-site-association /
 *     assetlinks.json → ouvre l'app DIRECTEMENT (sans afficher cette page)
 *  4. Si l'app n'est pas installée : cette page s'affiche + bouton manuel
 *     "Ouvrir YANA" avec scheme yana:// et fallback store.
 *
 * Le token session_id est transmis à l'app via query string du deep link.
 */
export default async function ActivatePage({ searchParams }: Props) {
  const sp = await searchParams
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : ''
  const fallbackDeepLink = sessionId
    ? `yana://activate?session_id=${encodeURIComponent(sessionId)}`
    : 'yana://activate'

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#03040a',
        color: '#f0f2ff',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '32px 28px',
          borderRadius: 24,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#F97316' }}>
          Merci !
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, opacity: 0.78, marginBottom: 24 }}>
          Ton abonnement est actif. YANA ouvre ton app automatiquement — si rien
          ne se passe, appuie sur le bouton ci-dessous.
        </p>

        <a
          href={fallbackDeepLink}
          style={{
            display: 'block',
            padding: '14px 24px',
            background: '#F97316',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            borderRadius: 14,
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          Ouvrir YANA
        </a>

        <Link
          href="/"
          style={{
            display: 'block',
            padding: '12px 24px',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Pas encore installée ? Revenir à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
