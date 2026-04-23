import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { streamNamaPilote, type NamaPiloteContext } from '@/lib/claude'
import { CHAT_DAILY_LIMITS } from '@/lib/constants'
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

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error, ...(extra ?? {}) }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return jsonError(401, 'Connexion requise.')

  const json = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? 'Données invalides.')
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, plan, role, full_name, sanskrit_level, seeds_balance, co2_offset_total_kg, trees_planted_total, daily_questions, daily_questions_reset_at',
    )
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return jsonError(404, 'Profil introuvable.')

  // Super admin = plan legende (multiplicateur max)
  const plan: Plan = profile.role === 'super_admin' ? 'legende' : (profile.plan as Plan)

  // Rate limit quotidien (reset à minuit UTC via champ date)
  const today = todayIso()
  const limit = CHAT_DAILY_LIMITS[plan] ?? CHAT_DAILY_LIMITS.free
  const isSameDay = profile.daily_questions_reset_at === today
  const usedToday = isSameDay ? (profile.daily_questions ?? 0) : 0
  if (Number.isFinite(limit) && usedToday >= limit) {
    return jsonError(
      429,
      plan === 'free'
        ? `Limite quotidienne atteinte (${limit} messages gratuits/jour). Passe à Essentiel pour 20/jour.`
        : `Limite quotidienne atteinte (${limit} messages). Reviens demain ou passe à Legende (illimité).`,
      { plan, used: usedToday, limit },
    )
  }

  // Incrémenter avant stream (optimiste — si Claude fail, le compteur reste +1
  // pour éviter abus retry). Reset si jour différent.
  await admin
    .from('profiles')
    .update({
      daily_questions: usedToday + 1,
      daily_questions_reset_at: today,
    })
    .eq('id', profile.id)

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
  if (!lastUserMsg) return jsonError(400, 'Aucun message à envoyer.')
  let conversationId = parsed.data.conversation_id

  if (conversationId) {
    // Sécurité : vérifier ownership de la conversation (anti-injection cross-user)
    const { data: conv } = await admin
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (!conv || conv.user_id !== profile.id) {
      return jsonError(403, 'Conversation introuvable ou accès refusé.')
    }
  } else {
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
    // Touch conversation updated_at pour tri liste
    await admin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
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
