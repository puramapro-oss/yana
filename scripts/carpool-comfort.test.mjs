import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

const source = (text) => ({ url: 'data:text/javascript,' + encodeURIComponent(text), shortCircuit: true })
registerHooks({ resolve(name, context, next) {
  if (name === 'next/server') return source('export const NextResponse = Response')
  if (name === '@/lib/supabase-server') return source("export const createServerSupabaseClient = () => ({auth:{ getUser: async () => ({data:{user:{id:'user'}}}) }})")
  if (name === '@/lib/supabase') return source('export const createServiceClient = () => globalThis.comfortSearchDatabase')
  if (name.startsWith('@/lib/')) return { url: new URL('../src/lib/' + name.slice(6) + '.ts', import.meta.url).href, shortCircuit: true }
  return next(name, context)
} })

const { GET } = await import('../src/app/api/carpool/search/route.ts')
const omitted = '00000000-0000-4000-8000-000000000003'
const rides = [[false,false],[true,false],[false,true],[true,true],[true,true]].map(([silent_ride, pets_allowed], i) => ({
  id: i === 3 ? omitted : String(i), driver_id: 'driver', status: 'open', seats_remaining: 2,
  departure_at: '2099-01-01T08:00:00Z', estimated_duration_min: 20,
  from_city: 'Bouverans', to_city: 'Frasne', silent_ride, pets_allowed,
}))
function db() {
  return { from(table) {
    assert.equal(table, 'carpools')
    let rows = [...rides]
    const filter = (predicate) => { rows = rows.filter(predicate); return query }
    const query = {
      select() { return this }, order() { return this },
      eq: (key,v) => filter(r => r[key] === v), neq: (key,v) => filter(r => r[key] !== v),
      gte: (key,v) => filter(r => r[key] >= v), ilike: (key,v) => filter(r => r[key] === v),
      gt: (key,v) => filter(r => r[key] > v), lt: (key,v) => filter(r => r[key] < v),
      range: async (i,j) => ({ data: rows.slice(i,j+1) }),
    }
    return query
  } }
}
test('la recherche applique les préférences cumulées avant la pagination et conserve les critères de repli', async () => {
  globalThis.comfortSearchDatabase = db()
  for (const [extra, wanted] of [
    ['', ['0','1','2','4']], ['silent_ride=1', ['1','4']],
    ['pets_allowed=1', ['2','4']], ['silent_ride=1&pets_allowed=1', ['4']],
  ]) {
    const query = 'from=Bouverans&to=Frasne&min_seats=2&arrive_by=2099-01-01T08:20:00Z&exclude_id=' + omitted
    const res = await GET(new Request('https://yana.example/api/carpool/search?' + query + '&' + extra))
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(body.carpools.map(row => row.id), wanted)
  }
})
