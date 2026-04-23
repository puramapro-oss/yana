import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { startKyc } from '@/lib/onfido'

export const runtime = 'nodejs'

const BodySchema = z.object({
  trigger: z
    .enum(['terra_nova_activation', 'carpool_first_booking'])
    .default('carpool_first_booking'),
})

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()

  // Réutiliser la dernière vérif si encore pending/processing (pas de doublon)
  const { data: last } = await admin
    .from('kyc_verifications')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (last) {
    const result = await startKyc({
      user_id: user.id,
      email: user.email ?? null,
      trigger: parsed.data.trigger,
    })
    return NextResponse.json({
      verification_id: last.id,
      status: last.status,
      sdk_token: result.sdk_token,
      fallback_reason: result.fallback_reason ?? null,
      reused: true,
    })
  }

  const result = await startKyc({
    user_id: user.id,
    email: user.email ?? null,
    trigger: parsed.data.trigger,
  })

  const { data: verif, error } = await admin
    .from('kyc_verifications')
    .insert({
      user_id: user.id,
      provider: result.provider,
      applicant_id: result.applicant_id,
      check_id: result.check_id,
      status: result.status,
      triggered_by: parsed.data.trigger,
    })
    .select('id, status')
    .single()

  if (error || !verif) {
    return NextResponse.json(
      { error: 'Démarrage de la vérification impossible. Réessaie.' },
      { status: 500 },
    )
  }

  await admin.from('profiles').update({ onfido_status: verif.status }).eq('id', user.id)

  return NextResponse.json({
    verification_id: verif.id,
    status: verif.status,
    sdk_token: result.sdk_token,
    fallback_reason: result.fallback_reason ?? null,
    reused: false,
  })
}
