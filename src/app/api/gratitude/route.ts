import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  content: z.string().trim().min(3, 'Note trop courte (min 3 caractères).').max(500),
})

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const { data: inserted, error } = await admin
    .from('gratitude_entries')
    .insert({ user_id: auth.user.id, content: parsed.data.content })
    .select('id, content, created_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer. Réessaie dans un instant.' },
      { status: 500 },
    )
  }

  // XP éveil
  await admin.from('awakening_events').insert({
    user_id: auth.user.id,
    event_type: 'gratitude_journal',
    xp_gained: 5,
  })

  return NextResponse.json({ ok: true, entry: inserted, xp_earned: 5 })
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data } = await admin
    .from('gratitude_entries')
    .select('id, content, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ entries: data ?? [] })
}
