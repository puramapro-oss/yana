import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { REF_COOKIE_NAME } from '@/lib/referral-attribution'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 jours

// POST /api/referral/set-cookie { code }
// Pose le cookie HttpOnly yana_ref avant une redirection OAuth externe.
// Valide le code côté serveur (contre l'injection + cohérence).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const raw = typeof body?.code === 'string' ? body.code : ''
  const code = raw.trim().toUpperCase()

  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    return NextResponse.json({ set: false, reason: 'invalid_format' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ set: false, reason: 'unknown_code' }, { status: 404 })
  }

  const response = NextResponse.json({ set: true })
  response.cookies.set(REF_COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return response
}
