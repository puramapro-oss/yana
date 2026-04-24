import { NextResponse } from 'next/server'

// Expose VAPID public key au client (SW subscribe). Public by design.
export const runtime = 'nodejs'

export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ error: 'vapid_not_configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey: key })
}
