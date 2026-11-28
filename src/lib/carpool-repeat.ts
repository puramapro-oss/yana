import { createHash } from 'node:crypto'
import type { Carpool } from '@/types'
import type { createServiceClient } from '@/lib/supabase'

type RepeatSource = Pick<Carpool,
  'id' | 'from_city' | 'to_city' | 'from_geohash' | 'to_geohash' |
  'meeting_point_label' | 'meeting_point_geohash' | 'estimated_duration_min' |
  'seats_total' | 'price_per_seat_cents' | 'description' | 'women_only' | 'silent_ride' | 'pets_allowed'
>

export type RepeatFormValues = Omit<RepeatSource, 'from_geohash' | 'to_geohash' | 'meeting_point_geohash'>

export function findRepeatSource(admin: ReturnType<typeof createServiceClient>, userId: string, sourceId: string) {
  return admin.from('carpools')
    .select('id, from_city, to_city, from_geohash, to_geohash, meeting_point_label, meeting_point_geohash, estimated_duration_min, seats_total, price_per_seat_cents, description, women_only, silent_ride, pets_allowed')
    .eq('id', sourceId)
    .eq('driver_id', userId)
    .eq('status', 'completed')
    .maybeSingle<RepeatSource>()
}

/** One departure for this completed offer even after a lost publish response. */
export function repeatedDepartureId(driverId: string, sourceId: string, departure: Date) {
  const bytes = createHash('sha256')
    .update(`yana:repeat:${driverId}:${sourceId}:${departure.toISOString()}`)
    .digest()
    .subarray(0, 16)
  bytes[6] = (bytes[6]! & 0x0f) | 0x80
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
