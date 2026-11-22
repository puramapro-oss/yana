import type { User } from '@supabase/supabase-js'
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
// - 401 si l'identité ne peut pas être vérifiée par Supabase Auth
// - 403 sans rôle serveur super_admin ni email propriétaire confirmé par Auth
// À utiliser au tout début de chaque route handler /api/admin/*
export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  let user: User
  try {
    const supabase = await createServerSupabaseClient()
    const { data: auth, error } = await supabase.auth.getUser()
    if (error || !auth.user) return { ok: false, status: 401, reason: 'unauthenticated' }
    user = auth.user
  } catch {
    return { ok: false, status: 401, reason: 'unauthenticated' }
  }

  const identity: AdminAuthSuccess = { ok: true, userId: user.id, email: user.email ?? '' }
  if (user.email === SUPER_ADMIN_EMAIL && user.email_confirmed_at) return identity

  try {
    const admin = createServiceClient()
    const { data: profile, error } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (error || profile?.role !== 'super_admin') {
      return { ok: false, status: 403, reason: 'forbidden' }
    }
    return identity
  } catch {
    return { ok: false, status: 403, reason: 'forbidden' }
  }
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
