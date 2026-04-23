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

  const [itemsRes, profileRes, purchasesRes] = await Promise.all([
    admin
      .from('point_shop_items')
      .select('id, slug, category, name, description, cost_points, item_type, value_cents, discount_percent, duration_days, target_plan, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    admin
      .from('profiles')
      .select('purama_points')
      .eq('id', user.id)
      .single(),
    admin
      .from('point_purchases')
      .select('id, item_id, points_spent, coupon_code, expires_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (itemsRes.error) {
    return NextResponse.json({ error: 'shop_fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({
    items: itemsRes.data ?? [],
    balance: Number(profileRes.data?.purama_points ?? 0),
    purchases: purchasesRes.data ?? [],
  })
}
