import type { Metadata } from 'next'
import LegalPage from '@/lib/legal/components/LegalPage'
import { buildMentionsLegales } from '@/lib/legal/content/mentions-legales'
import { CURRENT_LEGAL_VERSIONS } from '@/lib/legal/versions'
import { YANA_LEGAL_CONFIG } from '@/lib/legal/app-config'

export const metadata: Metadata = {
  title: 'Mentions Légales — YANA',
  description: 'Mentions légales de YANA par SASU PURAMA.',
}

export default function MentionsLegales() {
  return (
    <LegalPage
      titre="Mentions Légales"
      sections={buildMentionsLegales(YANA_LEGAL_CONFIG)}
      derniereMiseAJour={CURRENT_LEGAL_VERSIONS.mentions}
    />
  )
}
