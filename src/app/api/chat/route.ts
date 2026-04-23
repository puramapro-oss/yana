import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { streamNamaPilote, type NamaPiloteContext } from '@/lib/claude'
import type { Plan } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
})

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  conversation_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  vehicle_type: z.string().optional(),
})

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Connexion requise.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Données invalides.' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, plan, role, full_name, sanskrit_level, seeds_balance, co2_offset_total_kg, trees_planted_total',
    )
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Profil introuvable.' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  // Super admin = plan legende (multiplicateur max)
  const plan: Plan = profile.role === 'super_admin' ? 'legende' : (profile.plan as Plan)

  // Contexte NAMA-PILOTE (injecté dans le system prompt)
  const ctx: NamaPiloteContext = {
    full_name: profile.full_name ?? null,
    plan,
    vehicle_type: parsed.data.vehicle_type ?? null,
    current_trip_id: parsed.data.trip_id ?? null,
    sanskrit_level: profile.sanskrit_level ?? null,
    seeds_balance: profile.seeds_balance ?? null,
    co2_offset_total_kg: profile.co2_offset_total_kg ?? null,
    trees_planted_total: profile.trees_planted_total ?? null,
  }

  // Persist user message (append mode or create new conversation)
  const lastUserMsg = parsed.data.messages[parsed.data.messages.length - 1]
  let conversationId = parsed.data.conversation_id

  if (!conversationId) {
    const { data: conv } = await admin
      .from('conversations')
      .insert({ user_id: profile.id, title: lastUserMsg.content.slice(0, 60) })
      .select('id')
      .single()
    conversationId = conv?.id
  }

  if (conversationId && lastUserMsg.role === 'user') {
    await admin.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: lastUserMsg.content,
    })
  }

  // Stream SSE (pattern LEARNINGS #21 VIDA-ASSOC)
  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (conversationId) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ conversation_id: conversationId })}\n\n`,
            ),
          )
        }
        for await (const delta of streamNamaPilote(parsed.data.messages, plan, ctx)) {
          fullText += delta
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
      } finally {
        if (conversationId && fullText) {
          await admin.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullText,
          })
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'x-accel-buffering': 'no',
    },
  })
}
