import type { Detail } from './types'

export async function fetchCarpoolDetail(id: string): Promise<Detail> {
  const res = await fetch(`/api/carpool/${id}`)
  if (!res.ok) throw new Error('Impossible de charger le trajet.')
  return res.json()
}
