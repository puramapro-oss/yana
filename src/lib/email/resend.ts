// Client Resend + sendTemplate() wrapping idempotence + log email_sequences.
// Unique point d'envoi d'emails pour YANA. Pour envoyer un email ailleurs :
// sendTemplate({ userId, type: 'welcome_d0', vars: { first_name } }) — c'est tout.

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { renderEmailHtml, renderEmailText } from './layout'

const FROM = 'YANA <yana@purama.dev>'
const REPLY_TO = 'support@purama.dev'

function appUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://yana.purama.dev'
  return raw.replace(/\/+$/, '')
}

let resendClient: Resend | null = null
function client(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY manquant')
    resendClient = new Resend(key)
  }
  return resendClient
}

// Substitution {{var}} simple, safe (vars inconnues → string vide).
function interpolate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key]
    return typeof value === 'string' ? value : ''
  })
}

export interface SendTemplateArgs {
  /** UUID yana.profiles.id (auth.users.id) */
  userId: string
  /** type de template (FK email_templates.type) */
  type: string
  /** variables additionnelles — {{first_name}} auto + {{app_url}} auto */
  vars?: Record<string, string>
  /** id externe (referral_id, contest_period, level) pour events seulement */
  contextRef?: string
}

export type SendTemplateResult =
  | { ok: true; resendId: string; sequenceId: string }
  | {
      ok: false
      reason: 'unsubscribed' | 'already_sent' | 'template_missing' | 'no_email' | 'send_failed'
      detail?: string
    }

/**
 * Envoie un email template à un user.
 * - Idempotent via table email_sequences (daily UNIQUE sur user+type où context_ref IS NULL,
 *   event UNIQUE sur user+type+context_ref).
 * - Respecte kill-switch email_unsubscribes.
 * - Log succès + erreurs dans email_sequences pour monitoring.
 */
export async function sendTemplate(args: SendTemplateArgs): Promise<SendTemplateResult> {
  const supa = createServiceClient()

  // 1. kill-switch marketing
  const { data: unsub } = await supa
    .from('email_unsubscribes')
    .select('user_id')
    .eq('user_id', args.userId)
    .maybeSingle()
  if (unsub) return { ok: false, reason: 'unsubscribed' }

  // 2. profil (email + first_name)
  const { data: profile, error: profileErr } = await supa
    .from('profiles')
    .select('email, full_name')
    .eq('id', args.userId)
    .maybeSingle()
  if (profileErr || !profile?.email) {
    return { ok: false, reason: 'no_email', detail: profileErr?.message }
  }

  // 3. template actif
  const { data: tpl, error: tplErr } = await supa
    .from('email_templates')
    .select('type, category, subject, heading, body, cta_label, cta_url_template, footer_note')
    .eq('type', args.type)
    .eq('active', true)
    .maybeSingle()
  if (tplErr || !tpl) {
    return { ok: false, reason: 'template_missing', detail: tplErr?.message ?? args.type }
  }

  // 4. check idempotence pré-insert
  const baseQuery = supa
    .from('email_sequences')
    .select('id')
    .eq('user_id', args.userId)
    .eq('template_type', args.type)
    .is('error', null)
    .limit(1)
  const query = args.contextRef
    ? baseQuery.eq('context_ref', args.contextRef)
    : baseQuery.is('context_ref', null)
  const { data: already } = await query
  if (already && already.length > 0) {
    return { ok: false, reason: 'already_sent' }
  }

  // 5. vars finales
  const firstName = (profile.full_name ?? '').split(' ')[0] || 'Pilote'
  const allVars: Record<string, string> = {
    first_name: firstName,
    app_url: appUrl(),
    ...(args.vars ?? {}),
  }

  const subject = interpolate(tpl.subject, allVars)
  const heading = interpolate(tpl.heading, allVars)
  const body = interpolate(tpl.body, allVars)
  const ctaLabel = interpolate(tpl.cta_label, allVars)
  const ctaUrl = interpolate(tpl.cta_url_template, allVars)
  const footerNote = tpl.footer_note ? interpolate(tpl.footer_note, allVars) : undefined

  // 6. insert sequence AVANT envoi → unique constraint sert de lock anti-race-condition
  const { data: seq, error: seqErr } = await supa
    .from('email_sequences')
    .insert({
      user_id: args.userId,
      template_type: args.type,
      context_ref: args.contextRef ?? null,
      subject_snapshot: subject,
    })
    .select('id, unsubscribe_token')
    .single()
  if (seqErr || !seq) {
    if (seqErr?.code === '23505') return { ok: false, reason: 'already_sent' }
    return { ok: false, reason: 'send_failed', detail: seqErr?.message }
  }

  const unsubscribeUrl = `${appUrl()}/api/email/unsubscribe?token=${seq.unsubscribe_token}`

  const html = renderEmailHtml({
    heading,
    body,
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    footer_note: footerNote,
    unsubscribe_url: unsubscribeUrl,
  })
  const text = renderEmailText({
    heading,
    body,
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    footer_note: footerNote,
    unsubscribe_url: unsubscribeUrl,
  })

  // 7. envoi Resend
  try {
    const result = await client().emails.send({
      from: FROM,
      to: profile.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    if (result.error) {
      const errMsg = String(result.error.message ?? result.error)
      await supa.from('email_sequences').update({ error: errMsg }).eq('id', seq.id)
      return { ok: false, reason: 'send_failed', detail: errMsg }
    }

    const resendId = result.data?.id ?? ''
    await supa.from('email_sequences').update({ resend_id: resendId }).eq('id', seq.id)

    return { ok: true, resendId, sequenceId: seq.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supa.from('email_sequences').update({ error: msg }).eq('id', seq.id)
    return { ok: false, reason: 'send_failed', detail: msg }
  }
}
