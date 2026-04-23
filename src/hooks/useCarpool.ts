'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Carpool, CarpoolBooking } from '@/types'

export interface CreateCarpoolInput {
  from_city: string
  to_city: string
  from_lat: number
  from_lng: number
  to_lat: number
  to_lng: number
  departure_at: string            // ISO
  seats_total: number
  price_per_seat_eur: number
  description?: string | null
  women_only?: boolean
  silent_ride?: boolean
  pets_allowed?: boolean
}

export interface SearchCarpoolInput {
  from_lat?: number
  from_lng?: number
  to_lat?: number
  to_lng?: number
  departure_from?: string         // ISO
  departure_to?: string
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

  useEffect(() => {
    fetchMine()
  }, [fetchMine])

  const create = useCallback(
    async (input: CreateCarpoolInput): Promise<{ carpool: Carpool | null; error: string | null }> => {
      const res = await fetch('/api/carpool/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) return { carpool: null, error: payload.error ?? 'Création impossible.' }
      await fetchMine()
      return { carpool: payload.carpool as Carpool, error: null }
    },
    [fetchMine],
  )

  const search = useCallback(async (input: SearchCarpoolInput): Promise<Carpool[]> => {
    const params = new URLSearchParams()
    if (input.from_lat != null) params.set('from_lat', String(input.from_lat))
    if (input.from_lng != null) params.set('from_lng', String(input.from_lng))
    if (input.to_lat != null) params.set('to_lat', String(input.to_lat))
    if (input.to_lng != null) params.set('to_lng', String(input.to_lng))
    if (input.departure_from) params.set('from_at', input.departure_from)
    if (input.departure_to) params.set('to_at', input.departure_to)
    if (input.women_only) params.set('women_only', '1')
    const res = await fetch(`/api/carpool/search?${params.toString()}`)
    if (!res.ok) return []
    const payload = await res.json().catch(() => ({}))
    return (payload.carpools ?? []) as Carpool[]
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
