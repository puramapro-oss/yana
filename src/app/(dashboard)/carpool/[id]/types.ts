import type { Carpool, CarpoolBooking } from '@/types'

export interface DriverView {
  id: string
  full_name: string
  avatar_url: string | null
  trust_score: number | null
  sanskrit_level: string | null
  kyc_approved: boolean
}

export interface Detail {
  carpool: Carpool
  driver: DriverView | null
  my_booking: CarpoolBooking | null
  is_driver: boolean
}

export interface SafeWalkContact {
  name: string
  phone: string
}
