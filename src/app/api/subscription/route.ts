import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()

  const [profileRes, paymentsRes, invoicesRes] = await Promise.all([
    admin
      .from('profiles')
      .select('plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single(),
    admin
      .from('payments')
      .select('id, amount_cents, currency, status, created_at, stripe_invoice_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    admin
      .from('invoices')
      .select('id, number, amount_cents, pdf_url, issued_at')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
      .limit(12),
  ])

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  }

  return NextResponse.json({
    plan: profileRes.data.plan ?? 'free',
    hasStripeCustomer: Boolean(profileRes.data.stripe_customer_id),
    hasActiveSubscription: Boolean(profileRes.data.stripe_subscription_id),
    payments: paymentsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
  })
}
