import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25
const MAX_PAGE = 200

export async function GET(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const url = new URL(req.url)
  const pageRaw = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.min(MAX_PAGE, Math.trunc(pageRaw))) : 1
  const rawSearch = (url.searchParams.get('q') ?? '').trim()
  const planFilter = url.searchParams.get('plan')?.trim() || null
  const roleFilter = url.searchParams.get('role')?.trim() || null

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const admin = createServiceClient()
  let query = admin
    .from('profiles')
    .select(
      'id, email, full_name, role, plan, wallet_balance_cents, purama_points, xp, level, streak_days, created_at, metadata',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (rawSearch) {
    const escaped = rawSearch.replace(/[%_]/g, (c) => `\\${c}`)
    query = query.or(`email.ilike.%${escaped}%,full_name.ilike.%${escaped}%`)
  }
  if (planFilter) query = query.eq('plan', planFilter)
  if (roleFilter) query = query.eq('role', roleFilter)

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger les utilisateurs.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    users: data ?? [],
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  })
}
