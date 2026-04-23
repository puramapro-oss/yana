import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  action: z.enum(['in_progress', 'resolve', 'close']),
  note: z.string().trim().max(2000).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Identifiant ticket invalide.' }, { status: 400 })
  }

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const actionMap: Record<string, string> = {
    in_progress: 'in_progress',
    resolve: 'resolved',
    close: 'closed',
  }
  const newStatus = actionMap[parsed.data.action]

  const admin = createServiceClient()
  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, status, ai_response')
    .eq('id', id)
    .maybeSingle()

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket introuvable.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = { status: newStatus }
  if (parsed.data.note) {
    const prefix = ticket.ai_response ? `${ticket.ai_response}\n\n---\n[Admin ${auth.email} · ${new Date().toISOString()}]\n` : `[Admin ${auth.email} · ${new Date().toISOString()}]\n`
    updatePayload.ai_response = `${prefix}${parsed.data.note}`
  }

  const { error } = await admin
    .from('support_tickets')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: 'Mise à jour impossible.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, action: parsed.data.action, status: newStatus })
}
