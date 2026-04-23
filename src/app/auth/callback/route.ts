import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { attributeReferral, REF_COOKIE_NAME } from '@/lib/referral-attribution'

export const runtime = 'nodejs'

function hashIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  const refCookie = request.cookies.get(REF_COOKIE_NAME)?.value
  if (refCookie) {
    await attributeReferral({
      referredUserId: data.user.id,
      referralCode: refCookie,
      ipHash: hashIp(request),
    })
  }

  const response = NextResponse.redirect(new URL(next, origin))
  if (refCookie) {
    response.cookies.set(REF_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  }
  return response
}
