import type { Metadata } from 'next'
import LegalPage from '@/lib/legal/components/LegalPage'
import { buildCGV } from '@/lib/legal/content/cgv'
import { CURRENT_LEGAL_VERSIONS } from '@/lib/legal/versions'
import { YANA_LEGAL_CONFIG } from '@/lib/legal/app-config'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — YANA',
  description: 'CGV de YANA par SASU PURAMA.',
}

export default function CGV() {
  return (
    <LegalPage
      titre="Conditions Générales de Vente"
      sections={buildCGV(YANA_LEGAL_CONFIG)}
      derniereMiseAJour={CURRENT_LEGAL_VERSIONS.cgv}
    />
  )
}
