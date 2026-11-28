import type { Carpool, CarpoolBooking } from '@/types'

export interface DriverView {
  id: string
  full_name: string
  avatar_url: string | null
  trust_score: number | null
  sanskrit_level: string | null
  kyc_approved: boolean
}

export interface ArrivalConfirmation {
  driver_confirmed: boolean
  passenger_confirmed: boolean
  my_seeds: number | null
  settlement: 'free' | 'historical' | 'awaiting_funding'
}

export interface Detail {
  my_confirmation: ArrivalConfirmation | null
  driver_bookings: (ArrivalConfirmation & Pick<CarpoolBooking, 'id' | 'status' | 'seats' | 'total_price_cents' | 'payout_driver_cents' | 'payout_passenger_cents' | 'payout_platform_cents' | 'payout_eco_pool_cents'>)[]
  carpool: Carpool
  driver: DriverView | null
  my_booking: CarpoolBooking | null
  is_driver: boolean
}

export interface SafeWalkContact {
  name: string
  phone: string
}
