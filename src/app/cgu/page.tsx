import type { Metadata } from 'next'
import LegalPage from '@/lib/legal/components/LegalPage'
import { buildCGU } from '@/lib/legal/content/cgu'
import { CURRENT_LEGAL_VERSIONS } from '@/lib/legal/versions'
import { YANA_LEGAL_CONFIG } from '@/lib/legal/app-config'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — YANA",
  description: 'CGU de YANA par SASU PURAMA.',
}

export default function CGU() {
  return (
    <LegalPage
      titre="Conditions Générales d'Utilisation"
      sections={buildCGU(YANA_LEGAL_CONFIG)}
      derniereMiseAJour={CURRENT_LEGAL_VERSIONS.cgu}
    />
  )
}
