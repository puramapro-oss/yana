'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'
import type { Profile, Plan } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const profileIdRef = useRef<string | null>(null)
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (profileIdRef.current === userId && profile) return
      profileIdRef.current = userId

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) setProfile(data as Profile)
    },
    [supabase, profile],
  )

  useEffect(() => {
    const getSession = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) await fetchProfile(s.user.id)
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      // ERRORS #4 SUTRA : skip TOKEN_REFRESHED → évite boucle re-render
      if (event === 'TOKEN_REFRESHED') return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) await fetchProfile(s.user.id)
      else {
        setProfile(null)
        profileIdRef.current = null
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [supabase],
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, referralCode?: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { error }
    },
    [supabase],
  )

  const signInWithGoogle = useCallback(async () => {
    // ERRORS §OAuth solution permanente : createBrowserClient de @supabase/ssr
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }, [supabase])

  const signOut = useCallback(async () => {
    // ERRORS #2 SUTRA : signOut() + clear storage + window.location.href
    await supabase.auth.signOut()
    try {
      localStorage.clear()
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
      })
    } catch {
      /* ignore */
    }
    window.location.href = '/login'
  }, [supabase])

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      })
      return { error }
    },
    [supabase],
  )

  const refetch = useCallback(async () => {
    if (user) {
      profileIdRef.current = null
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || profile?.role === 'super_admin'

  // Super admin = plan "legende" (multiplicateur ×10)
  const effectivePlan: Plan = isSuperAdmin ? 'legende' : (profile?.plan ?? 'free')

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    refetch,
    isAuthenticated: !!user,
    isSuperAdmin,
    isAdmin: isSuperAdmin,
    plan: effectivePlan,
  }
}
