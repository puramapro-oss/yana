import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: string | null
  purama_points: number | null
  xp: number | null
  level: number | null
  streak_days: number | null
  wallet_balance_cents: number | null
}

type State = {
  profile: Profile | null
  loading: boolean
  error: string | null
}

/**
 * Lit `yana.profiles` pour l'utilisateur courant via supabase-js direct
 * (RLS garantit l'isolation). Pas d'API intermédiaire — plus rapide,
 * plus simple, et scale sans charge sur les routes /api/profile web.
 */
export function useProfile() {
  const [state, setState] = useState<State>({ profile: null, loading: true, error: null })

  const fetchProfile = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setState({ profile: null, loading: false, error: null })
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, avatar_url, plan, purama_points, xp, level, streak_days, wallet_balance_cents',
      )
      .eq('id', user.id)
      .single()

    if (error) {
      setState({ profile: null, loading: false, error: error.message })
      return
    }
    setState({ profile: data as Profile, loading: false, error: null })
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { ...state, refresh: fetchProfile }
}
