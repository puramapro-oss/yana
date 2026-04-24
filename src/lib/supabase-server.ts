import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { APP_SCHEMA } from './constants'

// Server client — used in Server Components and API Routes.
// Passing `req` enables mobile Bearer token auth (Expo app) while keeping
// cookie-based auth working for the web app. Bearer wins over cookies.
export async function createServerSupabaseClient(req?: Request) {
  const cookieStore = await cookies()
  const authHeader = req?.headers.get('authorization') ?? null
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookies are read-only
          }
        },
      },
      global: bearerToken
        ? { headers: { Authorization: `Bearer ${bearerToken}` } }
        : undefined,
      db: { schema: APP_SCHEMA },
    }
  )
}
