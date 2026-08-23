import type { Metadata } from 'next'
import LegalPage from '@/lib/legal/components/LegalPage'
import { buildPolitiqueConfidentialite } from '@/lib/legal/content/politique-confidentialite'
import { CURRENT_LEGAL_VERSIONS } from '@/lib/legal/versions'
import { YANA_LEGAL_CONFIG } from '@/lib/legal/app-config'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — YANA',
  description: 'Politique de confidentialité et protection des données personnelles de YANA.',
}

export default function PolitiqueConfidentialite() {
  return (
    <LegalPage
      titre="Politique de Confidentialité"
      sections={buildPolitiqueConfidentialite(YANA_LEGAL_CONFIG, process.env)}
      derniereMiseAJour={CURRENT_LEGAL_VERSIONS.confidentialite}
    />
  )
}
