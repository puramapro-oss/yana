import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const ALLOWED_STATUS = ['open', 'in_progress', 'resolved', 'closed'] as const

export async function GET(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const url = new URL(req.url)
  const statusRaw = url.searchParams.get('status')?.trim() || 'open'
  if (!ALLOWED_STATUS.includes(statusRaw as (typeof ALLOWED_STATUS)[number])) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('support_tickets')
    .select('id, user_id, name, email, subject, message, status, resolved_by_ai, ai_response, escalated, created_at')
    .eq('status', statusRaw)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger les tickets.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ tickets: data ?? [], status: statusRaw })
}
