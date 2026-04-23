import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawLimit = parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= MAX_LIMIT ? rawLimit : DEFAULT_LIMIT
  const periodType = searchParams.get('period') === 'monthly' ? 'monthly' : 'weekly'

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('contest_results')
    .select('id, period_type, period_start, period_end, total_pool_cents, winners, completed_at')
    .eq('period_type', periodType)
    .order('period_end', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'contest_history_fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({ history: data ?? [] })
}
