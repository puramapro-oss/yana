import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// /go/[slug] — Attribution parrainage
// Valide le code dans yana.profiles.referral_code puis pose un cookie HttpOnly 30 jours
// qui sera lu côté /auth/callback (OAuth) et à la confirmation email pour créer la ligne referrals.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COOKIE_NAME = 'yana_ref'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 jours

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const code = slug.trim().toUpperCase().slice(0, 16)

  const origin = new URL(request.url).origin

  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    return NextResponse.redirect(new URL('/', origin))
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, referral_code')
    .eq('referral_code', code)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/', origin))
  }

  const response = NextResponse.redirect(new URL(`/signup?ref=${code}`, origin))
  response.cookies.set(COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  return response
}
