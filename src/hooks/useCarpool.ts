'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SearchableCarpool } from '@/lib/carpool-arrival'
import type { Carpool, CarpoolBooking } from '@/types'

export type CreateCarpoolInput = {
  departure_at: string            // ISO
  estimated_duration_min?: number | null
  seats_total: number
  price_per_seat_eur: number
  description?: string | null
  women_only?: boolean
  silent_ride?: boolean
  pets_allowed?: boolean
} & ({
  from_city: string
  to_city: string
  from_lat: number
  from_lng: number
  to_lat: number
  to_lng: number
} | { repeat_from_id: string })

export interface SearchCarpoolInput {
  from_city?: string
  to_city?: string
  departure_after?: string
  arrive_by?: string
  exclude_id?: string
  min_seats?: string
  from_lat?: number
  from_lng?: number
  to_lat?: number
  to_lng?: number
  departure_from?: string         // ISO
  departure_to?: string
  silent_ride?: boolean
  pets_allowed?: boolean
  women_only?: boolean
}

interface UseCarpoolState {
  mine_as_driver: Carpool[]
  mine_as_passenger: CarpoolBooking[]
  loading: boolean
  error: string | null
}

const INITIAL: UseCarpoolState = {
  mine_as_driver: [],
  mine_as_passenger: [],
  loading: true,
  error: null,
}

export function useCarpool() {
  const { user } = useAuth()
  const [state, setState] = useState<UseCarpoolState>(INITIAL)
  const supabase = createClient()

  const fetchMine = useCallback(async () => {
    if (!user) {
      setState({ ...INITIAL, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    const [asDriver, asPassenger] = await Promise.all([
      supabase
        .from('carpools')
        .select('*')
        .eq('driver_id', user.id)
        .order('departure_at', { ascending: false })
        .limit(50),
      supabase
        .from('carpool_bookings')
        .select('*')
        .eq('passenger_id', user.id)
        .order('booked_at', { ascending: false })
        .limit(50),
    ])

    setState({
      mine_as_driver: (asDriver.data ?? []) as Carpool[],
      mine_as_passenger: (asPassenger.data ?? []) as CarpoolBooking[],
      loading: false,
      error: asDriver.error || asPassenger.error ? 'Impossible de charger tes trajets.' : null,
    })
  }, [user, supabase])

  useEffect(() => { void (async () => { await fetchMine(); })(); }, [fetchMine])

  const create = useCallback(
    async (input: CreateCarpoolInput): Promise<{ carpool: Carpool | null; error: string | null; alreadyPublished?: boolean }> => {
      const res = await fetch('/api/carpool/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) return { carpool: null, error: payload.error ?? 'Création impossible.' }
      void fetchMine().catch(() => setState(s => ({ ...s, loading: false, error: 'Actualisation des trajets indisponible.' })))
      return { carpool: payload.carpool as Carpool, error: null, alreadyPublished: payload.already_published === true }
    },
    [fetchMine],
  )

  const search = useCallback(async (input: SearchCarpoolInput): Promise<SearchableCarpool[]> => {
    const params = new URLSearchParams()
    if (input.from_city) params.set('from', input.from_city)
    if (input.to_city) params.set('to', input.to_city)
    if (input.departure_after) params.set('departure_after', input.departure_after)
    if (input.arrive_by) params.set('arrive_by', input.arrive_by)
    if (input.exclude_id) params.set('exclude_id', input.exclude_id)
    if (input.min_seats) params.set('min_seats', input.min_seats)
    if (input.from_lat != null) params.set('from_lat', String(input.from_lat))
    if (input.from_lng != null) params.set('from_lng', String(input.from_lng))
    if (input.to_lat != null) params.set('to_lat', String(input.to_lat))
    if (input.to_lng != null) params.set('to_lng', String(input.to_lng))
    if (input.departure_from) params.set('from_at', input.departure_from)
    if (input.departure_to) params.set('to_at', input.departure_to)
    if (input.women_only) params.set('women_only', '1')
    if (input.silent_ride) params.set('silent_ride', '1')
    if (input.pets_allowed) params.set('pets_allowed', '1')
    const res = await fetch(`/api/carpool/search?${params.toString()}`)
    const payload = await res.json()
    if (!res.ok || !Array.isArray(payload.carpools)) {
      throw new Error(payload.error ?? 'Recherche impossible. Réessaie.')
    }
    return payload.carpools as SearchableCarpool[]
  }, [])

  const book = useCallback(
    async (
      carpoolId: string,
      input: { seats: number; safe_walk_contacts?: Array<{ name: string; phone: string }> },
    ): Promise<{ booking: CarpoolBooking | null; error: string | null; kyc_required?: boolean }> => {
      const res = await fetch(`/api/carpool/${carpoolId}/book`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        return {
          booking: null,
          error: payload.error ?? 'Réservation impossible.',
          kyc_required: payload.kyc_required === true,
        }
      }
      await fetchMine()
      return { booking: payload.booking as CarpoolBooking, error: null }
    },
    [fetchMine],
  )

  const complete = useCallback(
    async (bookingId: string): Promise<{ error: string | null }> => {
      const res = await fetch(`/api/carpool/booking/${bookingId}/complete`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) return { error: payload.error ?? 'Clôture impossible.' }
      await fetchMine()
      return { error: null }
    },
    [fetchMine],
  )

  return {
    ...state,
    create,
    search,
    book,
    complete,
    refetch: fetchMine,
  }
}
