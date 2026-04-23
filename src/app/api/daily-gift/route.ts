import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  ALREADY_OPENED_TODAY: {
    message: 'Tu as déjà ouvert ton cadeau aujourd\'hui. Reviens demain.',
    status: 409,
  },
  USER_NOT_FOUND: { message: 'Profil introuvable.', status: 404 },
}

// GET : status du coffre (openable ? + streak + last_opened)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('daily_gifts')
    .select('gift_type, gift_value, streak_count, opened_at')
    .eq('user_id', user.id)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'daily_gift_fetch_failed' }, { status: 500 })
  }

  const lastOpenedAt = data?.opened_at ?? null
  const streak = data?.streak_count ?? 0
  const now = Date.now()
  const hoursSinceLast = lastOpenedAt
    ? (now - new Date(lastOpenedAt).getTime()) / 3_600_000
    : Infinity
  const canOpen = hoursSinceLast >= 20

  // Si > 48h depuis la dernière ouverture, streak est cassé (reset à 0 dans l'affichage)
  const streakBroken = hoursSinceLast > 48

  return NextResponse.json({
    canOpen,
    lastOpenedAt,
    streakCount: streakBroken ? 0 : streak,
    lastGift: lastOpenedAt
      ? { gift_type: data!.gift_type, gift_value: data!.gift_value }
      : null,
  })
}

// POST : ouvrir le coffre (appel RPC atomique)
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin.rpc('open_daily_gift', { p_user_id: user.id })

  if (error) {
    return NextResponse.json({ error: 'Impossible d\'ouvrir le coffre. Réessaie.' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data

  if (row?.error_code) {
    const mapped = ERROR_MESSAGES[row.error_code] ?? { message: 'Erreur inconnue.', status: 500 }
    return NextResponse.json({ error: mapped.message, code: row.error_code }, { status: mapped.status })
  }

  return NextResponse.json({
    giftType: row.gift_type,
    giftValue: row.gift_value,
    streakCount: row.streak_count,
    newPointsBalance: row.new_points_balance,
  })
}
