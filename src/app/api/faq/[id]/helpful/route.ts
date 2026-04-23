import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Incrément du compteur helpful_count ("Pouce utile") d'un article FAQ.
// Idempotent via cookie 1 an : un même visiteur ne peut voter
// qu'une fois par article (cookie "yana_faq_h_<id>").
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }

  const cookieName = `yana_faq_h_${id}`
  const cookieHeader = req.headers.get('cookie') ?? ''
  const alreadyVoted = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .some((c) => c.startsWith(`${cookieName}=`))

  if (alreadyVoted) {
    return NextResponse.json(
      { error: 'Merci, ton vote a déjà été pris en compte.' },
      { status: 409 },
    )
  }

  const admin = createServiceClient()
  const { data: current } = await admin
    .from('faq_articles')
    .select('helpful_count')
    .eq('id', id)
    .eq('active', true)
    .maybeSingle()

  if (!current) {
    return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })
  }

  const nextValue = (current.helpful_count ?? 0) + 1
  await admin.from('faq_articles').update({ helpful_count: nextValue }).eq('id', id)

  const res = NextResponse.json({ ok: true, helpful_count: nextValue })
  res.cookies.set(cookieName, '1', {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
