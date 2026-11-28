import type { Carpool, CarpoolBooking } from '@/types'

export function carpoolMapLinks(
  carpool: Pick<Carpool, 'from_city' | 'to_city' | 'meeting_point_label' | 'status'>,
  bookingStatus: CarpoolBooking['status'] | undefined,
  isDriver: boolean,
) {
  const cityMap = new URL('https://www.google.com/maps/search/')
  cityMap.search = new URLSearchParams({ api: '1', query: carpool.to_city }).toString()
  const label = carpool.meeting_point_label?.trim()
  let meetingDirections: string | null = null
  if (label && carpool.status !== 'cancelled'
    && (isDriver || bookingStatus === 'confirmed' || bookingStatus === 'in_progress')) {
    const map = new URL('https://www.google.com/maps/dir/')
    map.search = new URLSearchParams({
      api: '1', destination: `${label}, ${carpool.from_city}`,
    }).toString()
    meetingDirections = map.href
  }
  return { destinationCity: cityMap.href, meetingDirections }
}
