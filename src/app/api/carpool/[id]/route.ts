import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const IdSchema = z.string().uuid({ message: 'Trajet invalide.' })

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { id } = await ctx.params
  const parsed = IdSchema.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]!.message }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: carpool, error } = await admin
    .from('carpools')
    .select('*')
    .eq('id', parsed.data)
    .maybeSingle()

  if (error || !carpool) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }

  // Infos driver — anonymisées sauf si l'user est déjà passager confirmé
  const { data: driver } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, trust_score, sanskrit_level, onfido_status')
    .eq('id', carpool.driver_id)
    .maybeSingle()

  // Récupère mon booking existant s'il y en a un
  const { data: myBooking, error: bookingReadError } = await admin
    .from('carpool_bookings')
    .select('id,carpool_id,passenger_id,seats,total_price_cents,total_prime_cents,status,booked_at,completed_at,safe_walk_contacts,driver_rating,passenger_rating,driver_feedback,passenger_feedback,payout_driver_cents,payout_passenger_cents,payout_platform_cents,payout_eco_pool_cents,driver_confirmed_at,passenger_confirmed_at,passenger_seeds_awarded')
    .eq('carpool_id', carpool.id)
    .eq('passenger_id', user.id)
    .maybeSingle()

  if (bookingReadError) return NextResponse.json({ error: 'Réservation indisponible.' }, { status: 503 })
  const isDriver = carpool.driver_id === user.id
  const { data: riders, error: ridersError } = isDriver
    ? await admin.from('carpool_bookings')
      .select('id,seats,status,total_price_cents,payout_driver_cents,payout_passenger_cents,payout_platform_cents,payout_eco_pool_cents,driver_confirmed_at,passenger_confirmed_at,driver_seeds_awarded')
      .eq('carpool_id', carpool.id).order('booked_at')
    : { data: [], error: null }
  if (ridersError) return NextResponse.json({ error: 'Réservations indisponibles.' }, { status: 503 })
  const { passenger_seeds_awarded: passengerAward,
    driver_confirmed_at, passenger_confirmed_at, ...passengerBooking } = myBooking ?? {}
  const showMeetingPoint = isDriver || ['confirmed', 'in_progress', 'completed'].includes(myBooking?.status)
  const driverName = driver?.full_name?.trim().split(/\s+/)[0] || 'Conducteur YANA'
  return NextResponse.json({
    carpool: showMeetingPoint ? carpool : { ...carpool, meeting_point_geohash: null, meeting_point_label: null },
    driver: driver
      ? {
          id: driver.id,
          full_name: showMeetingPoint ? driver.full_name ?? driverName : driverName,
          avatar_url: driver.avatar_url,
          trust_score: driver.trust_score,
          sanskrit_level: driver.sanskrit_level,
          kyc_approved: driver.onfido_status === 'approved',
        }
      : null,
    my_booking: myBooking ? passengerBooking : null,
    my_confirmation: myBooking ? {
      driver_confirmed: Boolean(driver_confirmed_at), passenger_confirmed: Boolean(passenger_confirmed_at),
      my_seeds: passengerAward ?? null,
      settlement: fundingState(myBooking.status, myBooking.total_price_cents, passengerAward),
    } : null,
    driver_bookings: (riders ?? []).map(row => ({
      id: row.id, seats: row.seats, status: row.status, total_price_cents: row.total_price_cents,
      driver_confirmed: Boolean(row.driver_confirmed_at), passenger_confirmed: Boolean(row.passenger_confirmed_at),
      payout_driver_cents: row.payout_driver_cents, payout_passenger_cents: row.payout_passenger_cents,
      payout_platform_cents: row.payout_platform_cents, payout_eco_pool_cents: row.payout_eco_pool_cents,
      my_seeds: row.driver_seeds_awarded,
      settlement: fundingState(row.status, row.total_price_cents, row.driver_seeds_awarded),
    })),
    is_driver: carpool.driver_id === user.id,
  })
}

function fundingState(status: string, price: number, seeds: number | null) {
  if (status === 'completed' && seeds == null) return 'historical'
  return price === 0 ? 'free' : 'awaiting_funding'
}
