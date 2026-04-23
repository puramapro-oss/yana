import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { attributeReferral, REF_COOKIE_NAME } from '@/lib/referral-attribution'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hashIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

// POST /api/referral/attribute
// Consumé par le formulaire /signup après signUp email réussi.
// Le path OAuth est géré dans /auth/callback directement.
// Idempotent — clear le cookie dans tous les cas pour éviter double attribution.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ attributed: false, reason: 'unauthenticated' }, { status: 401 })
  }

  const refCookie = request.cookies.get(REF_COOKIE_NAME)?.value

  // Fallback body param : cas /signup?ref=CODE sans passer par /go/
  let bodyCode: string | undefined
  try {
    const body = await request.json().catch(() => null)
    if (body && typeof body.code === 'string') bodyCode = body.code
  } catch {
    // body vide ou non-JSON, ignore
  }

  const codeToUse = refCookie || bodyCode
  let attributed = false

  if (codeToUse) {
    attributed = await attributeReferral({
      referredUserId: user.id,
      referralCode: codeToUse,
      ipHash: hashIp(request),
    })
  }

  const response = NextResponse.json({ attributed })
  response.cookies.set(REF_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return response
}
