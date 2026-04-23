import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { calculateDualReward, applyPlanMultiplierToSeeds } from '@/lib/dual-reward'
import { PLANS } from '@/lib/constants'
import type { Plan } from '@/types'

export const runtime = 'nodejs'

const IdSchema = z.string().uuid({ message: 'Réservation invalide.' })

interface BookingRow {
  id: string
  carpool_id: string
  passenger_id: string
  seats: number
  total_price_cents: number
  status: string
  payout_driver_cents: number
  payout_platform_cents: number
  payout_eco_pool_cents: number
}

interface CarpoolRow {
  id: string
  driver_id: string
  price_per_seat_cents: number
  status: string
}

interface ProfileLite {
  id: string
  role: string
  plan: Plan
  seeds_balance: number
  wallet_balance_cents: number
}

async function creditPool(
  admin: ReturnType<typeof createServiceClient>,
  poolType: 'reward_users' | 'asso_purama' | 'sasu_purama' | 'eco_trees',
  amountCents: number,
  reason: string,
  metadata: Record<string, unknown>,
) {
  if (amountCents <= 0) return
  // upsert + incrément atomique
  await admin.rpc('yana_pool_credit', {
    p_pool_type: poolType,
    p_amount_cents: amountCents,
    p_reason: reason,
    p_metadata: metadata,
  })
}

async function fallbackCreditPool(
  admin: ReturnType<typeof createServiceClient>,
  poolType: 'reward_users' | 'asso_purama' | 'sasu_purama' | 'eco_trees',
  amountCents: number,
  reason: string,
  metadata: Record<string, unknown>,
) {
  // Si la RPC n'existe pas (MVP), on fait un upsert manuel atomique-suffisant.
  if (amountCents <= 0) return
  const { data: existing } = await admin
    .from('pool_balances')
    .select('balance_cents, total_in_cents, total_out_cents')
    .eq('pool_type', poolType)
    .maybeSingle()

  if (existing) {
    await admin
      .from('pool_balances')
      .update({
        balance_cents: Number(existing.balance_cents) + amountCents,
        total_in_cents: Number(existing.total_in_cents) + amountCents,
      })
      .eq('pool_type', poolType)
  } else {
    await admin.from('pool_balances').insert({
      pool_type: poolType,
      balance_cents: amountCents,
      total_in_cents: amountCents,
      total_out_cents: 0,
    })
  }

  await admin.from('pool_transactions').insert({
    pool_type: poolType,
    amount_cents: amountCents,
    direction: 'credit',
    reason,
    metadata,
  })
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { id } = await ctx.params
  const parsedId = IdSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json({ error: parsedId.error.issues[0]!.message }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: booking } = await admin
    .from('carpool_bookings')
    .select(
      'id, carpool_id, passenger_id, seats, total_price_cents, status, payout_driver_cents, payout_platform_cents, payout_eco_pool_cents',
    )
    .eq('id', parsedId.data)
    .maybeSingle<BookingRow>()

  if (!booking) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  }
  if (booking.status === 'completed') {
    return NextResponse.json({ error: 'Déjà clôturée.' }, { status: 409 })
  }
  if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
    return NextResponse.json(
      { error: 'Cette réservation ne peut pas être clôturée dans son état actuel.' },
      { status: 409 },
    )
  }

  const { data: carpool } = await admin
    .from('carpools')
    .select('id, driver_id, price_per_seat_cents, status')
    .eq('id', booking.carpool_id)
    .maybeSingle<CarpoolRow>()

  if (!carpool) {
    return NextResponse.json({ error: 'Trajet introuvable.' }, { status: 404 })
  }

  // Seuls driver ou passenger peuvent clôturer (ou super_admin)
  const { data: caller } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!caller) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const allowed =
    caller.role === 'super_admin' ||
    caller.id === carpool.driver_id ||
    caller.id === booking.passenger_id
  if (!allowed) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  // Split Dual Reward sur le prix payé
  const split = calculateDualReward(booking.total_price_cents)

  // Charger driver + passenger pour appliquer plan multiplier sur Graines
  const [driverRes, passengerRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, role, plan, seeds_balance, wallet_balance_cents')
      .eq('id', carpool.driver_id)
      .maybeSingle<ProfileLite>(),
    admin
      .from('profiles')
      .select('id, role, plan, seeds_balance, wallet_balance_cents')
      .eq('id', booking.passenger_id)
      .maybeSingle<ProfileLite>(),
  ])

  const driver = driverRes.data
  const passenger = passengerRes.data
  if (!driver || !passenger) {
    return NextResponse.json({ error: 'Profil conducteur/passager introuvable.' }, { status: 404 })
  }

  const driverPlan: Plan = driver.role === 'super_admin' ? 'legende' : driver.plan
  const passengerPlan: Plan = passenger.role === 'super_admin' ? 'legende' : passenger.plan
  const driverSeeds = applyPlanMultiplierToSeeds(split.seeds_for_driver, PLANS[driverPlan].multiplier)
  const passengerSeeds = applyPlanMultiplierToSeeds(
    split.seeds_for_passenger,
    PLANS[passengerPlan].multiplier,
  )

  // 1. Update booking
  await admin
    .from('carpool_bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      payout_driver_cents: split.payout_driver_cents,
      payout_platform_cents: split.payout_platform_cents,
      payout_eco_pool_cents: split.payout_eco_pool_cents,
      payout_passenger_cents: split.payout_passenger_cents,
    })
    .eq('id', booking.id)

  // 2. Crédit driver wallet € + Graines + wallet_transaction
  const newDriverBalance = driver.wallet_balance_cents + split.payout_driver_cents
  await admin
    .from('profiles')
    .update({
      seeds_balance: driver.seeds_balance + driverSeeds,
      wallet_balance_cents: newDriverBalance,
    })
    .eq('id', driver.id)

  if (split.payout_driver_cents > 0) {
    await admin.from('wallet_transactions').insert({
      user_id: driver.id,
      amount_cents: split.payout_driver_cents,
      direction: 'credit',
      reason: 'carpool_driver_payout',
      ref_type: 'carpool_booking',
      ref_id: booking.id,
      balance_after_cents: newDriverBalance,
    })
  }

  // 3. Crédit passenger Graines (pas d'€ côté passager en scheme 80/15/5)
  await admin
    .from('profiles')
    .update({ seeds_balance: passenger.seeds_balance + passengerSeeds })
    .eq('id', passenger.id)

  // 4. Pools platform + eco_trees — tentative RPC, fallback manuel
  try {
    await creditPool(admin, 'sasu_purama', split.payout_platform_cents, 'carpool_platform_fee', {
      booking_id: booking.id,
      carpool_id: carpool.id,
    })
    await creditPool(admin, 'eco_trees', split.payout_eco_pool_cents, 'carpool_eco_fund', {
      booking_id: booking.id,
      carpool_id: carpool.id,
    })
  } catch {
    await fallbackCreditPool(admin, 'sasu_purama', split.payout_platform_cents, 'carpool_platform_fee', {
      booking_id: booking.id,
      carpool_id: carpool.id,
    })
    await fallbackCreditPool(admin, 'eco_trees', split.payout_eco_pool_cents, 'carpool_eco_fund', {
      booking_id: booking.id,
      carpool_id: carpool.id,
    })
  }

  // 5. Marquer carpool 'completed' si toutes les bookings confirmées sont completed
  const { data: remainingBookings } = await admin
    .from('carpool_bookings')
    .select('id, status')
    .eq('carpool_id', carpool.id)
    .in('status', ['confirmed', 'in_progress'])

  if (!remainingBookings || remainingBookings.length === 0) {
    await admin
      .from('carpools')
      .update({ status: 'completed' })
      .eq('id', carpool.id)
  }

  return NextResponse.json({
    ok: true,
    split: {
      total_cents: split.total_cents,
      driver_cents: split.payout_driver_cents,
      platform_cents: split.payout_platform_cents,
      eco_cents: split.payout_eco_pool_cents,
    },
    seeds_credited: {
      driver: driverSeeds,
      passenger: passengerSeeds,
    },
  })
}
