import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function KycBanner() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-amber-300" />
        <p className="text-sm text-amber-100">
          Vérifie ton identité pour réserver ou proposer un trajet. On protège tout le monde.
        </p>
      </div>
      <Link
        href="/kyc"
        className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/25"
      >
        Lancer la vérification
      </Link>
    </div>
  )
}
