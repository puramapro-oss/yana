import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_THEMES = ['dark', 'light', 'oled'] as const
const ALLOWED_LOCALES = [
  'fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'zh',
  'ja', 'ko', 'hi', 'ru', 'tr', 'nl', 'pl', 'sv',
] as const

const patchSchema = z.object({
  full_name: z.string().trim().min(1, 'Nom requis').max(80, 'Nom trop long').optional(),
  theme: z.enum(ALLOWED_THEMES).optional(),
  locale: z.enum(ALLOWED_LOCALES).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : AAAA-MM-JJ')
    .refine((d) => {
      const parsed = new Date(d)
      if (!Number.isFinite(parsed.getTime())) return false
      const year = parsed.getUTCFullYear()
      const today = new Date()
      // 13 ans min (RGPD), 120 ans max
      const minYear = today.getUTCFullYear() - 120
      const maxYear = today.getUTCFullYear() - 13
      return year >= minYear && year <= maxYear
    }, 'Date de naissance invalide (minimum 13 ans)')
    .nullable()
    .optional(),
  notifications_enabled: z.boolean().optional(),
})

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('profiles')
    .select(
      'id, email, full_name, avatar_url, theme, locale, birthdate, notifications_enabled, ' +
      'plan, purama_points, xp, level, streak_days, tutorial_completed, created_at'
    )
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  }

  return NextResponse.json({ profile: data })
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.message ?? 'Paramètres invalides.' }, { status: 400 })
  }

  const payload = parsed.data
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select(
      'id, email, full_name, avatar_url, theme, locale, birthdate, notifications_enabled, ' +
      'plan, purama_points, xp, level, streak_days, tutorial_completed'
    )
    .single()

  if (error) {
    return NextResponse.json({ error: 'Mise à jour impossible. Réessaie.' }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
