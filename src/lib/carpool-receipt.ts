import { calculateDualReward } from './dual-reward.ts'
import type { CarpoolBooking } from '../types/mobility'

type FinancialAmounts = Pick<CarpoolBooking,
  'payout_driver_cents' | 'payout_platform_cents' | 'payout_eco_pool_cents' | 'payout_passenger_cents'
>
export type ReceiptBooking = FinancialAmounts & Pick<CarpoolBooking, 'status'>
export type ReceiptSettlement = 'awaiting_funding' | 'free' | 'historical' | null

export function carpoolReceipt(totalCents: number, booking?: ReceiptBooking, settlement?: ReceiptSettlement, cancelled = false) {
  if (cancelled || booking?.status === 'cancelled' || booking?.status === 'disputed') {
    return { kind: 'inactive', amounts: null } as const
  }
  if (booking?.status !== 'completed') {
    return { kind: 'estimate', amounts: calculateDualReward(totalCents) } as const
  }
  if (settlement === 'awaiting_funding') {
    return { kind: 'awaiting_funding', amounts: null } as const
  }

  const amounts = [
    booking.payout_driver_cents, booking.payout_platform_cents,
    booking.payout_eco_pool_cents, booking.payout_passenger_cents,
  ]
  if (amounts.some((n) => !Number.isSafeInteger(n) || n < 0) ||
      amounts.reduce((sum, n) => sum + n, 0) !== totalCents) {
    return { kind: 'unverified', amounts: null } as const
  }
  return { kind: 'recorded', amounts: booking } as const
}
