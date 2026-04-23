import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 60

type PublicStats = {
  users: number
  trips: number
  trees_planted: number
  co2_offset_kg: number
  rewards_distributed_eur: number
}

const FALLBACK: PublicStats = {
  users: 0,
  trips: 0,
  trees_planted: 0,
  co2_offset_kg: 0,
  rewards_distributed_eur: 0,
}

export async function GET() {
  try {
    const supabase = createServiceClient()

    const [usersRes, tripsRes, treesRes, poolRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('trips')
        .select('id, co2_kg', { count: 'exact' })
        .eq('status', 'completed'),
      supabase.from('trees_planted').select('tree_count, co2_offset_kg'),
      supabase.from('pool_transactions').select('amount_cents, direction, pool_type'),
    ])

    const users = usersRes.count ?? 0
    const trips = tripsRes.count ?? 0

    const treesRows = (treesRes.data ?? []) as Array<{
      tree_count: number | null
      co2_offset_kg: number | string | null
    }>
    const trees_planted = treesRows.reduce((sum, r) => sum + (r.tree_count ?? 0), 0)
    const co2_offset_kg = treesRows.reduce((sum, r) => sum + Number(r.co2_offset_kg ?? 0), 0)

    const poolRows = (poolRes.data ?? []) as Array<{
      amount_cents: number | null
      direction: string | null
      pool_type: string | null
    }>
    const rewardsCents = poolRows
      .filter((r) => r.direction === 'debit' && r.pool_type === 'reward_users')
      .reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)

    const stats: PublicStats = {
      users,
      trips,
      trees_planted,
      co2_offset_kg: Math.round(co2_offset_kg * 10) / 10,
      rewards_distributed_eur: Math.round(rewardsCents / 100),
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch {
    return NextResponse.json(FALLBACK, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  }
}
