import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const claimSchema = z.object({
  type: z.enum(['birthday', 'signup_anniversary']),
})

const REWARDS = {
  birthday: 500,
  signup_anniversary_per_year: 100,
} as const

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const parsed = claimSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const admin = createServiceClient()

  // Vérifier que l'event est bien aujourd'hui (anti-abus)
  const { data: profile, error } = await admin
    .from('profiles')
    .select('birthdate, created_at, purama_points')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  }

  const today = new Date()
  const todayMonth = today.getUTCMonth() + 1
  const todayDay = today.getUTCDate()
  const todayYear = today.getUTCFullYear()

  let eligible = false
  let rewardAmount = 0
  let reason = ''

  if (parsed.data.type === 'birthday') {
    if (!profile.birthdate) {
      return NextResponse.json({ error: 'Ajoute ta date de naissance dans ton profil.' }, { status: 400 })
    }
    const [, bMonth, bDay] = profile.birthdate.split('-').map(Number)
    eligible = bMonth === todayMonth && bDay === todayDay
    rewardAmount = REWARDS.birthday
    reason = 'birthday_gift'
  } else {
    const created = new Date(profile.created_at)
    const cMonth = created.getUTCMonth() + 1
    const cDay = created.getUTCDate()
    const cYear = created.getUTCFullYear()
    eligible = cMonth === todayMonth && cDay === todayDay && cYear < todayYear
    rewardAmount = (todayYear - cYear) * REWARDS.signup_anniversary_per_year
    reason = 'signup_anniversary_gift'
  }

  if (!eligible) {
    return NextResponse.json({ error: 'Cet événement n\'est pas aujourd\'hui.' }, { status: 400 })
  }

  // Anti double-claim : check user_events upsert avec next_trigger_at = today+1 an
  const eventTypeDb = parsed.data.type
  const { data: existing } = await admin
    .from('user_events')
    .select('last_triggered_at')
    .eq('user_id', user.id)
    .eq('event_type', eventTypeDb)
    .maybeSingle()

  if (existing?.last_triggered_at) {
    const lastYear = new Date(existing.last_triggered_at).getUTCFullYear()
    if (lastYear === todayYear) {
      return NextResponse.json({ error: 'Tu as déjà réclamé ce cadeau cette année.' }, { status: 409 })
    }
  }

  // Crédit points
  const newBalance = Number(profile.purama_points ?? 0) + rewardAmount
  const { error: updateErr } = await admin
    .from('profiles')
    .update({ purama_points: newBalance })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Crédit impossible. Réessaie.' }, { status: 500 })
  }

  await Promise.all([
    admin.from('point_transactions').insert({
      user_id: user.id,
      amount: rewardAmount,
      direction: 'credit',
      reason,
      source: eventTypeDb,
      balance_after: newBalance,
    }),
    admin.from('user_events').upsert(
      {
        user_id: user.id,
        event_type: eventTypeDb,
        last_triggered_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,event_type' },
    ),
    admin.from('notifications').insert({
      user_id: user.id,
      type: 'birthday',
      title: parsed.data.type === 'birthday' ? 'Joyeux anniversaire' : 'Anniversaire YANA',
      body: `+${rewardAmount} pts crédités.`,
    }),
  ])

  return NextResponse.json({
    success: true,
    rewardAmount,
    newBalance,
  })
}
