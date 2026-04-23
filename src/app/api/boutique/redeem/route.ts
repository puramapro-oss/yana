import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const redeemSchema = z.object({
  slug: z.string().min(1).max(64),
})

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  ITEM_NOT_FOUND: { message: 'Cet article n\'existe plus.', status: 404 },
  USER_NOT_FOUND: { message: 'Profil introuvable. Reconnecte-toi.', status: 404 },
  INSUFFICIENT_POINTS: { message: 'Pas assez de points pour cet article.', status: 400 },
}

export async function POST(request: Request) {
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

  const parsed = redeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin.rpc('redeem_shop_item', {
    p_user_id: user.id,
    p_item_slug: parsed.data.slug,
  })

  if (error) {
    return NextResponse.json({ error: 'Une erreur est survenue. Réessaie.' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data

  if (row?.error_code) {
    const mapped = ERROR_MESSAGES[row.error_code] ?? { message: 'Erreur inconnue.', status: 500 }
    return NextResponse.json(
      { error: mapped.message, code: row.error_code, balance: row.new_balance },
      { status: mapped.status },
    )
  }

  return NextResponse.json({
    success: true,
    purchaseId: row.purchase_id,
    balance: row.new_balance,
    couponCode: row.coupon_code,
    itemName: row.item_name,
    itemType: row.item_type,
  })
}
