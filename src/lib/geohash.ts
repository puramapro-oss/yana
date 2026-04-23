// lib/geohash.ts — Geohash encoder + proximity utilities (MIT ref spec).
// Pas de dépendance externe : lib npm geohash est abandonnée, l'algo tient
// en 30 lignes et est stable depuis 2008.
//
// Précision par longueur :
//   1 =  5000 km · 2 = 1250 km · 3 = 156 km · 4 =  39 km
//   5 =   4.9 km · 6 =  1.2 km · 7 = 152 m  · 8 =  38 m
// Pour le matching covoiturage, on utilise 4 (~40km) en search, 5 (~5km) en
// filtrage fin. precision=5 => matching "même ville / banlieue proche".

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

export function encode(lat: number, lng: number, precision = 5): string {
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180
  let isEven = true
  let bit = 0
  let ch = 0
  let hash = ''
  while (hash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2
      if (lng >= mid) {
        ch = (ch << 1) + 1
        lngMin = mid
      } else {
        ch = ch << 1
        lngMax = mid
      }
    } else {
      const mid = (latMin + latMax) / 2
      if (lat >= mid) {
        ch = (ch << 1) + 1
        latMin = mid
      } else {
        ch = ch << 1
        latMax = mid
      }
    }
    isEven = !isEven
    if (++bit === 5) {
      hash += BASE32[ch]
      bit = 0
      ch = 0
    }
  }
  return hash
}

/**
 * Prefix commun à 2 geohashes = proximité approximative.
 * commonPrefixLength('u09tv', 'u09th') === 3 → même zone ~40km.
 */
export function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return i
  }
  return n
}

/**
 * Filtrage rapide : trajets dont le prefix de `minPrefix` caractères matche.
 * Utilisé côté DB via `ilike 'u09%'` puis raffinement JS.
 */
export function geohashPrefix(hash: string, length: number): string {
  return hash.slice(0, Math.max(1, Math.min(hash.length, length)))
}
