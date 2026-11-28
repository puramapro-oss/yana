import Link from 'next/link'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { findRepeatSource } from '@/lib/carpool-repeat'
import NewCarpoolForm from './NewCarpoolForm'

export default async function NewCarpoolPage({ searchParams }: {
  searchParams: Promise<{ repeat?: string | string[] }>
}) {
  const { repeat } = await searchParams
  if (repeat === undefined) return <NewCarpoolForm />

  const id = z.uuid().safeParse(repeat)
  if (id.success) {
    const client = await createServerSupabaseClient()
    const { data: { user } } = await client.auth.getUser()
    if (user) {
      const { data } = await findRepeatSource(createServiceClient(), user.id, id.data)
      if (data) {
        return <NewCarpoolForm key={data.id} template={{
          id: data.id, from_city: data.from_city, to_city: data.to_city,
          meeting_point_label: data.meeting_point_label, seats_total: data.seats_total,
          estimated_duration_min: data.estimated_duration_min, price_per_seat_cents: data.price_per_seat_cents,
          description: data.description, women_only: data.women_only,
          silent_ride: data.silent_ride, pets_allowed: data.pets_allowed,
        }} />
      }
    }
  }
  return (
    <section className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-bold">Replanification indisponible</h1>
      <p>Tu peux reprendre un trajet terminé que tu as proposé.</p>
      <Link href="/carpool/new" className="text-[var(--cyan)] underline">Proposer un nouveau trajet</Link>
    </section>
  )
}

