import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const PatchSchema = z.object({
  is_primary: z.boolean().optional(),
  brand: z.string().trim().min(1).max(50).nullable().optional(),
  model: z.string().trim().min(1).max(80).nullable().optional(),
  year: z.number().int().min(1970).max(2030).nullable().optional(),
})

const IdSchema = z.string().uuid({ message: 'Identifiant de véhicule invalide.' })

function unauthorized() {
  return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
}

async function ensureOwnership(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  vehicleId: string,
) {
  const { data } = await admin
    .from('vehicles')
    .select('id, user_id')
    .eq('id', vehicleId)
    .maybeSingle()
  if (!data) return { found: false as const }
  if (data.user_id !== userId) return { found: true as const, owned: false as const }
  return { found: true as const, owned: true as const }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const parsedId = IdSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json({ error: parsedId.error.issues[0]!.message }, { status: 400 })
  }

  const json = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  const own = await ensureOwnership(admin, user.id, parsedId.data)
  if (!own.found) return NextResponse.json({ error: 'Véhicule introuvable.' }, { status: 404 })
  if (!own.owned) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  // Si on passe en primary, enlever le primary des autres
  if (parsed.data.is_primary === true) {
    await admin
      .from('vehicles')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .neq('id', parsedId.data)
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.is_primary !== undefined) update.is_primary = parsed.data.is_primary
  if (parsed.data.brand !== undefined) update.brand = parsed.data.brand
  if (parsed.data.model !== undefined) update.model = parsed.data.model
  if (parsed.data.year !== undefined) update.year = parsed.data.year

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('vehicles')
    .update(update)
    .eq('id', parsedId.data)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Mise à jour impossible. Réessaie.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ vehicle: data })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const parsedId = IdSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json({ error: parsedId.error.issues[0]!.message }, { status: 400 })
  }

  const admin = createServiceClient()
  const own = await ensureOwnership(admin, user.id, parsedId.data)
  if (!own.found) return NextResponse.json({ error: 'Véhicule introuvable.' }, { status: 404 })
  if (!own.owned) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { error } = await admin.from('vehicles').delete().eq('id', parsedId.data)
  if (error) {
    return NextResponse.json({ error: 'Suppression impossible. Réessaie.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
