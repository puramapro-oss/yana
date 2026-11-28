import type { Carpool } from '@/types'

export type SearchableCarpool = Omit<Carpool, 'meeting_point_label' | 'meeting_point_geohash'>

// A deadline crosses the API boundary as an instant with an explicit UTC offset.
export function parseCarpoolInstant(value: string): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!match) return null
  const date = new Date(match[1] + 'T00:00:00Z')
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

export function estimatedArrival(ride: {
  departure_at: string
  estimated_duration_min: number | null
}): number | null {
  const duration = ride.estimated_duration_min
  const departure = parseCarpoolInstant(ride.departure_at)
  if (!Number.isInteger(duration) || duration == null || duration <= 0 || departure == null) return null
  const arrival = departure + duration * 60_000
  return Number.isFinite(new Date(arrival).getTime()) ? arrival : null
}

// Round-trip the local fields so a nonexistent time during spring-forward cannot
// silently become a different deadline. At fall-back, offer both possible instants.
export function localDateTime(instant: number): string {
  const d = new Date(instant)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localDeadlineOptions(input: string): Date[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return []
  const wall = parseCarpoolInstant(input + 'Z')
  if (wall == null) return []
  const day = 86_400_000
  const offsets = new Set([-day, 0, day].map(delta => new Date(wall + delta).getTimezoneOffset()))
  return [...offsets]
    .map(offset => wall + offset * 60_000)
    .filter(instant => localDateTime(instant) === input)
    .sort((a, b) => a - b)
    .map(instant => new Date(instant))
}

// Apply the time window before the public result limit. An early departure with
// a long journey may arrive after a later departure with a shorter journey.
export async function findArrivalMatches<T extends { departure_at: string; estimated_duration_min: number | null }>(
  deadline: number,
  loadPage: (offset: number, size: number) => Promise<T[]>,
  limit = 100,
): Promise<T[]> {
  const matches: T[] = []
  for (let offset = 0; matches.length < limit; offset += limit) {
    const page = await loadPage(offset, limit)
    for (const ride of page) {
      const arrival = estimatedArrival(ride)
      if (arrival != null && arrival <= deadline) {
        matches.push(ride)
        if (matches.length === limit) break
      }
    }
    if (page.length < limit) break
  }
  return matches
}
