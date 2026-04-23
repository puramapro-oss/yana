import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export const runtime = 'nodejs'

// Simulation KYC approved — réservée aux super admins pour E2E tests tant
// que Onfido n'est pas branché. Crée (ou upgrade) une vérification en
// 'approved' + met profile.onfido_status='approved'.
export async function POST() {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const isSuperAdmin = profile.role === 'super_admin' || profile.email === SUPER_ADMIN_EMAIL
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'Simulation KYC réservée aux super admins.' },
      { status: 403 },
    )
  }

  const nowIso = new Date().toISOString()

  // Upsert : si verif pending existe → upgrade, sinon créer
  const { data: existing } = await admin
    .from('kyc_verifications')
    .select('id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await admin
      .from('kyc_verifications')
      .update({
        status: 'approved',
        completed_at: nowIso,
        result_json: { simulated: true, at: nowIso },
      })
      .eq('id', existing.id)
  } else {
    await admin.from('kyc_verifications').insert({
      user_id: profile.id,
      provider: 'onfido',
      status: 'approved',
      triggered_by: 'carpool_first_booking',
      completed_at: nowIso,
      result_json: { simulated: true, at: nowIso },
    })
  }

  await admin.from('profiles').update({ onfido_status: 'approved' }).eq('id', profile.id)

  return NextResponse.json({ ok: true, status: 'approved', simulated: true })
}
