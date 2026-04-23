import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  content: z.string().trim().min(3, 'Intention trop courte (min 3 caractères).').max(280),
})

const PatchSchema = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
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
    .from('intentions')
    .insert({ user_id: auth.user.id, content: parsed.data.content })
    .select('id, content, completed, created_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer. Réessaie dans un instant.' },
      { status: 500 },
    )
  }

  await admin.from('awakening_events').insert({
    user_id: auth.user.id,
    event_type: 'intention_set',
    xp_gained: 3,
  })

  return NextResponse.json({ ok: true, intention: inserted, xp_earned: 3 })
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const json = await req.json().catch(() => ({}))
  const parsed = PatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const { error } = await admin
    .from('intentions')
    .update({ completed: parsed.data.completed })
    .eq('id', parsed.data.id)
    .eq('user_id', auth.user.id)

  if (error) {
    return NextResponse.json(
      { error: 'Mise à jour impossible.' },
      { status: 500 },
    )
  }

  if (parsed.data.completed) {
    await admin.from('awakening_events').insert({
      user_id: auth.user.id,
      event_type: 'intention_completed',
      xp_gained: 5,
    })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data } = await admin
    .from('intentions')
    .select('id, content, completed, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ intentions: data ?? [] })
}
