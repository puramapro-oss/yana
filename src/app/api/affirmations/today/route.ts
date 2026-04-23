import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AffirmationRow {
  id: string
  category: string
  text_fr: string
  text_en: string
  frequency_weight: number
}

// Sélection pseudo-déterministe de l'affirmation du jour pour un utilisateur.
// - Clé = (user_id, date YYYY-MM-DD) → même affirmation affichée tant qu'on est le même jour
// - Pondération : frequency_weight (1 à 3+) = les affirmations à poids 3 ont 3× plus de
//   chances d'être tirées que celles à poids 1.
// - Log `awakening_events` une seule fois par jour (anti-double-XP via check de date).
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const localeParam = url.searchParams.get('locale')?.trim()
  const locale = localeParam === 'en' ? 'en' : 'fr'

  const admin = createServiceClient()
  const { data: affirmations, error } = await admin
    .from('affirmations')
    .select('id, category, text_fr, text_en, frequency_weight')

  const rows = (affirmations ?? []) as AffirmationRow[]
  if (error || rows.length === 0) {
    return NextResponse.json(
      { error: 'Aucune affirmation disponible pour le moment.' },
      { status: 503 },
    )
  }

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  const seedStr = `${auth.user.id}:${today}`
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  }

  const weighted: AffirmationRow[] = []
  for (const row of rows) {
    const weight = Math.max(1, Math.min(10, row.frequency_weight ?? 1))
    for (let i = 0; i < weight; i++) weighted.push(row)
  }
  const chosen = weighted[seed % weighted.length]

  // Log awakening_event (1 par user/jour max)
  const sinceIso = `${today}T00:00:00Z`
  const { count: alreadyLoggedToday } = await admin
    .from('awakening_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('event_type', 'affirmation_shown')
    .gte('created_at', sinceIso)

  if ((alreadyLoggedToday ?? 0) === 0) {
    await admin.from('awakening_events').insert({
      user_id: auth.user.id,
      event_type: 'affirmation_shown',
      xp_gained: 2,
    })
    // Incrément compteur profile (lecture/écriture côté admin bypass RLS)
    const { data: currentProfile } = await admin
      .from('profiles')
      .select('affirmations_seen, xp')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (currentProfile) {
      await admin
        .from('profiles')
        .update({
          affirmations_seen: Number(currentProfile.affirmations_seen ?? 0) + 1,
          xp: Number(currentProfile.xp ?? 0) + 2,
        })
        .eq('id', auth.user.id)
    }
  }

  const text = locale === 'en' ? chosen.text_en : chosen.text_fr

  return NextResponse.json({
    id: chosen.id,
    category: chosen.category,
    text,
    xp_earned_today: (alreadyLoggedToday ?? 0) === 0 ? 2 : 0,
  })
}
