import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { getAnthropic, MODEL_FAST } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { APP_NAME, APP_SLUG } from '@/lib/constants'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  subject: z.string().trim().min(3, 'Sujet trop court (min 3 caractères).').max(120),
  message: z.string().trim().min(10, 'Message trop court (min 10 caractères).').max(4000),
  guest_name: z.string().trim().min(2).max(80).optional(),
  guest_email: z.string().trim().email('Email invalide.').max(180).optional(),
  website: z.string().max(0).optional(),
})

interface FaqContext {
  category: string
  question: string
  answer: string
}

interface AiVerdict {
  confidence: number
  answer: string
  reason?: string
}

const RESOLVE_THRESHOLD = 0.7
const COOLDOWN_SECONDS = 60
const TARGET_EMAIL = 'purama.pro@gmail.com'
const FROM_EMAIL = 'YANA Support <noreply@purama.dev>'
const COOKIE_NAME = 'yana_sav_cooldown'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildSystemPrompt(faqs: FaqContext[]): string {
  const faqBlock = faqs
    .map(
      (f, i) =>
        `#${i + 1} [${f.category}] Q: ${f.question}\nR: ${f.answer}`,
    )
    .join('\n\n')

  return `Tu es NAMA Assistant, l'assistant support officiel de ${APP_NAME} (app mobilité wellness PURAMA).

RÈGLES STRICTES :
1. Tu ne dévoiles JAMAIS être Claude / Anthropic / une IA générative. Tu ES NAMA Assistant.
2. Tu tutoies avec chaleur, précision, empathie. Emojis utiles : 🛞 🌱 🧘 🛡️ 🌳.
3. Tu réponds UNIQUEMENT en français, structuré, actionnable.
4. Tu t'appuies EXCLUSIVEMENT sur la FAQ officielle ci-dessous. Aucune invention.
5. Si la question sort du scope FAQ (demande compte, bug technique non documenté, réclamation, remboursement, données personnelles, urgence) → confidence faible (<0.5).
6. Si la question contient un mot-clé d'urgence routière (accident, blessé, choc, collision) → confidence=0 et answer="🆘 Appelle le 15 (SAMU), 17 (Police), 18 (Pompiers) ou 112 maintenant. Le support YANA n'est pas un service d'urgence."

SORTIE OBLIGATOIRE — JSON strict, sans markdown, sans balises code :
{
  "confidence": 0.0 à 1.0 (ta certitude que la FAQ couvre la question),
  "answer": "Ta réponse complète en français, 2-6 phrases max, markdown léger autorisé (gras, listes).",
  "reason": "1 phrase interne pour expliquer pourquoi cette confidence"
}

FAQ OFFICIELLE ${APP_NAME} (seule source de vérité) :

${faqBlock}

Retourne UNIQUEMENT le JSON. Pas de texte avant ou après.`
}

function parseVerdict(raw: string): AiVerdict | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as {
      confidence?: unknown
      answer?: unknown
      reason?: unknown
    }
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : NaN
    const answer = typeof parsed.answer === 'string' ? parsed.answer : ''
    const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined
    if (!Number.isFinite(confidence) || !answer) return null
    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      answer: answer.trim(),
      reason,
    }
  } catch {
    return null
  }
}

async function tryAiResolve(
  subject: string,
  message: string,
): Promise<AiVerdict | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('faq_articles')
    .select('category, question, answer')
    .eq('active', true)
    .order('priority', { ascending: true })
    .limit(20)

  const faqs = (data ?? []) as FaqContext[]
  if (faqs.length === 0) return null

  try {
    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 1024,
      system: buildSystemPrompt(faqs),
      messages: [
        {
          role: 'user',
          content: `Sujet : ${subject}\n\nMessage utilisateur :\n${message}`,
        },
      ],
    })
    const block = response.content[0]
    if (!block || block.type !== 'text') return null
    return parseVerdict(block.text)
  } catch {
    return null
  }
}

async function sendEscalationEmail(params: {
  ticketId: string
  name: string
  email: string
  subject: string
  message: string
  aiVerdict: AiVerdict | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const safe = {
    name: escapeHtml(params.name),
    email: escapeHtml(params.email),
    subject: escapeHtml(params.subject),
    message: escapeHtml(params.message).replace(/\n/g, '<br>'),
    aiAnswer: params.aiVerdict ? escapeHtml(params.aiVerdict.answer).replace(/\n/g, '<br>') : null,
    confidence: params.aiVerdict ? params.aiVerdict.confidence.toFixed(2) : 'n/a',
    reason: params.aiVerdict?.reason ? escapeHtml(params.aiVerdict.reason) : null,
  }

  const aiBlock = safe.aiAnswer
    ? `<h3 style="color:#7C3AED;margin:16px 0 8px;">🤖 Tentative NAMA Assistant (confidence ${safe.confidence})</h3>
       <p style="background:#18181f;padding:12px;border-radius:8px;font-size:13px;line-height:1.5;">${safe.aiAnswer}</p>
       ${safe.reason ? `<p style="color:#6B7280;font-size:12px;margin:4px 0;"><em>Raison non-résolution : ${safe.reason}</em></p>` : ''}`
    : '<p style="color:#6B7280;font-size:12px;">Résolution IA non tentée (clé API absente).</p>'

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0F;color:#E5E7EB;padding:24px;border-radius:16px;">
      <h2 style="color:#F97316;margin:0 0 16px;">🎫 Ticket SAV ${APP_NAME} escaladé</h2>
      <p style="margin:8px 0;"><strong>Ticket ID :</strong> ${escapeHtml(params.ticketId)}</p>
      <p style="margin:8px 0;"><strong>De :</strong> ${safe.name} &lt;${safe.email}&gt;</p>
      <p style="margin:8px 0;"><strong>Sujet :</strong> ${safe.subject}</p>
      <hr style="border:none;border-top:1px solid #1f2937;margin:16px 0;">
      <h3 style="color:#0EA5E9;margin:16px 0 8px;">💬 Message utilisateur</h3>
      <p style="white-space:pre-wrap;line-height:1.6;background:#18181f;padding:12px;border-radius:8px;">${safe.message}</p>
      ${aiBlock}
      <hr style="border:none;border-top:1px solid #1f2937;margin:16px 0;">
      <p style="font-size:12px;color:#6B7280;">App : ${APP_SLUG} · Reçu le ${new Date().toLocaleString('fr-FR')}</p>
    </div>`

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TARGET_EMAIL,
      replyTo: params.email,
      subject: `[${APP_NAME} SAV] ${params.subject}`,
      html,
      text: `De: ${params.name} <${params.email}>\nSujet: ${params.subject}\nTicket: ${params.ticketId}\n\n${params.message}${params.aiVerdict ? `\n\n[Tentative IA confidence=${params.aiVerdict.confidence.toFixed(2)}]\n${params.aiVerdict.answer}` : ''}`,
    })
  } catch {
    // mail échoué : ticket reste en base avec escalated=true, purama.pro@gmail.com
    // pourra toujours consulter /admin/tickets. Pas de rollback ticket.
  }
}

export async function POST(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const onCooldown = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .some((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (onCooldown) {
    return NextResponse.json(
      { error: `Patiente quelques secondes avant d'envoyer une nouvelle question.` },
      { status: 429 },
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

  if (parsed.data.website && parsed.data.website.length > 0) {
    // honeypot — silently accept
    return NextResponse.json({ ok: true, resolved: false })
  }

  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  const authedUser = auth.user

  let name = parsed.data.guest_name ?? 'Utilisateur'
  let email = parsed.data.guest_email ?? ''
  let userId: string | null = null

  if (authedUser) {
    userId = authedUser.id
    email = authedUser.email ?? email
    const admin = createServiceClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', authedUser.id)
      .maybeSingle()
    if (profile?.full_name) name = profile.full_name
    if (profile?.email) email = profile.email
  }

  if (!email) {
    return NextResponse.json(
      { error: 'Email requis pour que nous puissions te répondre.' },
      { status: 400 },
    )
  }

  const { subject, message } = parsed.data
  const verdict = await tryAiResolve(subject, message)
  const resolvedByAi = Boolean(verdict && verdict.confidence >= RESOLVE_THRESHOLD)

  const admin = createServiceClient()
  const { data: ticket, error: insertError } = await admin
    .from('support_tickets')
    .insert({
      user_id: userId,
      name,
      email,
      subject,
      message,
      status: resolvedByAi ? 'resolved' : 'open',
      resolved_by_ai: resolvedByAi,
      ai_response: verdict?.answer ?? null,
      escalated: !resolvedByAi,
    })
    .select('id')
    .single()

  if (insertError || !ticket) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer ton message. Réessaie dans un instant." },
      { status: 500 },
    )
  }

  if (!resolvedByAi) {
    await sendEscalationEmail({
      ticketId: ticket.id,
      name,
      email,
      subject,
      message,
      aiVerdict: verdict,
    })
  }

  const res = NextResponse.json({
    ok: true,
    resolved: resolvedByAi,
    ticket_id: ticket.id,
    answer: resolvedByAi ? verdict?.answer : null,
    confidence: verdict?.confidence ?? null,
  })
  res.cookies.set(COOKIE_NAME, '1', {
    maxAge: COOLDOWN_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
