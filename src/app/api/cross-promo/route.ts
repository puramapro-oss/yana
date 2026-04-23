import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { pickCrossPromoApps, SIBLING_APPS } from '@/lib/cross-promo-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET : renvoie 2 apps pertinentes + statut "déjà cliqué" pour masquer les promos consommées
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: promos } = await admin
    .from('cross_promos')
    .select('target_app, used, created_at')
    .eq('user_id', user.id)
    .eq('source_app', 'yana')
    .order('created_at', { ascending: false })

  const usedByApp = new Map<string, { clicked: boolean; used: boolean }>()
  for (const p of promos ?? []) {
    const prev = usedByApp.get(p.target_app) ?? { clicked: false, used: false }
    usedByApp.set(p.target_app, { clicked: true, used: prev.used || p.used })
  }

  const picked = pickCrossPromoApps(user.id, 4) // pick 4 pour pouvoir filtrer used, garder 2
  const filtered = picked
    .filter((app) => !(usedByApp.get(app.slug)?.used ?? false))
    .slice(0, 2)

  return NextResponse.json({
    apps: filtered.map((app) => ({
      ...app,
      alreadyClicked: usedByApp.get(app.slug)?.clicked ?? false,
    })),
  })
}

const clickSchema = z.object({
  targetApp: z.string().min(1).max(32),
})

// POST /api/cross-promo : enregistre le clic (user_id, source_app='yana', target_app, coupon_code)
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
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const parsed = clickSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const app = SIBLING_APPS.find((a) => a.slug === parsed.data.targetApp)
  if (!app) {
    return NextResponse.json({ error: 'App cible inconnue.' }, { status: 404 })
  }

  const admin = createServiceClient()

  // Vérifier si déjà un row non-utilisé pour ce (user, source, target) → skip insert
  const { data: existing } = await admin
    .from('cross_promos')
    .select('id, used')
    .eq('user_id', user.id)
    .eq('source_app', 'yana')
    .eq('target_app', app.slug)
    .eq('used', false)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      success: true,
      couponCode: app.couponCode,
      url: app.url,
      newRow: false,
    })
  }

  const { error } = await admin.from('cross_promos').insert({
    user_id: user.id,
    source_app: 'yana',
    target_app: app.slug,
    coupon_code: app.couponCode,
  })

  if (error) {
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    couponCode: app.couponCode,
    url: app.url,
    newRow: true,
  })
}
