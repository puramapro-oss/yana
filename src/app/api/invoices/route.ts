import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

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

  const { data, error } = await admin
    .from('invoices')
    .select('id, number, stripe_invoice_id, amount_cents, currency, pdf_url, issued_at')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'invoices_fetch_failed' }, { status: 500 })
  }

  const invoices = data ?? []
  const currentYear = new Date().getUTCFullYear()
  const totalYearCents = invoices
    .filter((inv) => new Date(inv.issued_at).getUTCFullYear() === currentYear)
    .reduce((sum, inv) => sum + inv.amount_cents, 0)
  const totalLifetimeCents = invoices.reduce((sum, inv) => sum + inv.amount_cents, 0)

  return NextResponse.json({
    invoices,
    count: invoices.length,
    totalYearCents,
    totalLifetimeCents,
    currentYear,
  })
}
