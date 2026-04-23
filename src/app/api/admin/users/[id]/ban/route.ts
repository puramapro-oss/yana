import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  action: z.enum(['ban', 'unban']),
  reason: z.string().trim().max(500).optional(),
})

interface ProfileRow {
  id: string
  email: string
  metadata: Record<string, unknown> | null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Identifiant utilisateur invalide.' }, { status: 400 })
  }

  if (id === auth.userId) {
    return NextResponse.json(
      { error: 'Impossible de te bannir toi-même.' },
      { status: 400 },
    )
  }

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, metadata')
    .eq('id', id)
    .maybeSingle<ProfileRow>()

  if (!profile) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }

  const meta = { ...(profile.metadata ?? {}) }
  if (parsed.data.action === 'ban') {
    meta.banned = true
    meta.banned_at = new Date().toISOString()
    meta.banned_reason = parsed.data.reason ?? null
    meta.banned_by = auth.email
  } else {
    meta.banned = false
    meta.banned_at = null
    meta.banned_reason = null
    meta.unbanned_at = new Date().toISOString()
    meta.unbanned_by = auth.email
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ metadata: meta })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Mise à jour impossible. Réessaie dans un instant.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    action: parsed.data.action,
    user_id: id,
  })
}
