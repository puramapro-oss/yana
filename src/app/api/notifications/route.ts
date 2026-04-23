import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsedLimit = parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_LIMIT
    ? parsedLimit
    : DEFAULT_LIMIT

  const admin = createServiceClient()

  const [listRes, unreadCountRes] = await Promise.all([
    admin
      .from('notifications')
      .select('id, type, title, body, data, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ])

  if (listRes.error) {
    return NextResponse.json({ error: 'notifications_fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({
    notifications: listRes.data ?? [],
    unreadCount: unreadCountRes.count ?? 0,
  })
}

const patchSchema = z.object({
  action: z.enum(['mark_read', 'mark_all_read']),
  id: z.string().uuid().optional(),
})

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const admin = createServiceClient()

  if (parsed.data.action === 'mark_all_read') {
    const { error } = await admin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    if (error) {
      return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // mark_read
  if (!parsed.data.id) {
    return NextResponse.json({ error: 'ID de notification requis.' }, { status: 400 })
  }

  const { error } = await admin
    .from('notifications')
    .update({ read: true })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
