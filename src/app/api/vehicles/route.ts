import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const CreateSchema = z.object({
  vehicle_type: z.enum(['car', 'moto', 'scooter', 'ev_car', 'ev_moto', 'hybrid']),
  brand: z.string().trim().min(1).max(50).nullable().optional(),
  model: z.string().trim().min(1).max(80).nullable().optional(),
  year: z.number().int().min(1970).max(2030).nullable().optional(),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'plugin_hybrid', 'lpg', 'none']),
  is_primary: z.boolean().optional(),
})

function unauthorized() {
  return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
}

export async function GET(req: Request) {
  const sb = await createServerSupabaseClient(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return unauthorized()

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('vehicles')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de récupérer tes véhicules. Réessaie.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ vehicles: data ?? [] })
}

export async function POST(req: Request) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return unauthorized()

  const json = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()

  // Compte les véhicules existants → le 1er = primary auto
  const { count } = await admin
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const shouldBePrimary = parsed.data.is_primary ?? (count ?? 0) === 0

  // Si le nouveau devient primary, on enlève le primary des autres
  if (shouldBePrimary) {
    await admin.from('vehicles').update({ is_primary: false }).eq('user_id', user.id)
  }

  const { data, error } = await admin
    .from('vehicles')
    .insert({
      user_id: user.id,
      vehicle_type: parsed.data.vehicle_type,
      brand: parsed.data.brand ?? null,
      model: parsed.data.model ?? null,
      year: parsed.data.year ?? null,
      fuel_type: parsed.data.fuel_type,
      is_primary: shouldBePrimary,
    })
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Impossible d’enregistrer ce véhicule. Réessaie.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ vehicle: data }, { status: 201 })
}
