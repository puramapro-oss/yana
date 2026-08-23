/**
 * POST /api/legal/cookie-consent — synchronise en base le choix de cookies d'un utilisateur
 * authentifié (préférence déjà appliquée immédiatement côté client). Endpoint fourni par le
 * socle NIYAMA ; non appelé par le bandeau cookies actuel de YANA (CookieBanner existant,
 * localStorage-only, conservé tel quel — cf src/components/shared/CookieBanner.tsx).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const bodySchema = z.object({
  mesure: z.boolean(),
  marketing: z.boolean(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true, synced: false })

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { error } = await supabase.from('cookie_consents').upsert(
    {
      user_id: user.id,
      necessaire: true,
      mesure: parsed.data.mesure,
      marketing: parsed.data.marketing,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return NextResponse.json({ error: 'Enregistrement impossible.', debug: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, synced: true })
}
