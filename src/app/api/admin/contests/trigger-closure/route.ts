import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Déclenchement manuel d'un CRON classement-weekly ou tirage-monthly depuis
// /admin/contests. Réutilise la même logique (auth Bearer CRON_SECRET) en
// forwardant la requête vers l'endpoint CRON interne.

const BodySchema = z.object({
  target: z.enum(['weekly', 'monthly']),
})

export async function POST(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET non configuré côté serveur.' },
      { status: 503 },
    )
  }

  const endpoint = parsed.data.target === 'weekly' ? 'classement-weekly' : 'tirage-monthly'
  const baseUrl = new URL(req.url)
  baseUrl.pathname = `/api/cron/${endpoint}`
  baseUrl.search = ''

  try {
    const cronRes = await fetch(baseUrl.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    const cronJson = await cronRes.json()
    if (!cronRes.ok) {
      return NextResponse.json(
        { error: cronJson.error ?? 'Échec CRON.' },
        { status: cronRes.status },
      )
    }
    return NextResponse.json({
      ok: true,
      triggered: endpoint,
      triggered_by: auth.email,
      result: cronJson,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Impossible de déclencher le CRON.' },
      { status: 500 },
    )
  }
}
