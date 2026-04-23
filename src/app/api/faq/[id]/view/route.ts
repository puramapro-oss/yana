import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Incrément du compteur view_count d'un article FAQ.
// Idempotent via cookie 24h : un même visiteur ne peut incrémenter
// un même article qu'une fois par 24h (cookie "yana_faq_v_<id>").
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }

  const cookieName = `yana_faq_v_${id}`
  const cookieHeader = req.headers.get('cookie') ?? ''
  const alreadyViewed = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .some((c) => c.startsWith(`${cookieName}=`))

  if (alreadyViewed) {
    return NextResponse.json({ ok: true, counted: false })
  }

  const admin = createServiceClient()
  const { data: current } = await admin
    .from('faq_articles')
    .select('view_count')
    .eq('id', id)
    .eq('active', true)
    .maybeSingle()

  if (!current) {
    return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })
  }

  const nextValue = (current.view_count ?? 0) + 1
  await admin.from('faq_articles').update({ view_count: nextValue }).eq('id', id)

  const res = NextResponse.json({ ok: true, counted: true, view_count: nextValue })
  res.cookies.set(cookieName, '1', {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
