import { createServerSupabaseClient } from './supabase-server'
import { createServiceClient } from './supabase'
import { SUPER_ADMIN_EMAIL } from './constants'

export type AdminAuthFailure =
  | { ok: false; status: 401; reason: 'unauthenticated' }
  | { ok: false; status: 403; reason: 'forbidden' }
export type AdminAuthSuccess = {
  ok: true
  userId: string
  email: string
}
export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure

// Vérifie qu'un appel API /api/admin/* vient d'un super-admin authentifié.
// - 401 si pas de session
// - 403 si session mais profile.role != 'super_admin' ET email != SUPER_ADMIN_EMAIL
// À utiliser au tout début de chaque route handler /api/admin/*
export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) return { ok: false, status: 401, reason: 'unauthenticated' }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  const isSuper =
    profile?.role === 'super_admin' ||
    (profile?.email ?? user.email) === SUPER_ADMIN_EMAIL

  if (!isSuper) return { ok: false, status: 403, reason: 'forbidden' }

  return { ok: true, userId: user.id, email: profile?.email ?? user.email ?? '' }
}

export interface ProfileMetadata {
  banned?: boolean
  banned_at?: string | null
  banned_reason?: string | null
  [key: string]: unknown
}

export function isProfileBanned(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  const meta = metadata as ProfileMetadata
  return meta.banned === true
}
