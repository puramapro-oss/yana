import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthState = {
  session: Session | null
  user: User | null
  loading: boolean
}

/**
 * Source de vérité auth mobile. S'abonne à supabase.auth.onAuthStateChange()
 * et expose { session, user, loading }. Zéro context provider : chaque écran
 * qui a besoin de l'auth appelle ce hook directement.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true })

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setState({ session: data.session ?? null, user: data.session?.user ?? null, loading: false })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setState({ session, user: session?.user ?? null, loading: false })
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}

/** Déconnexion propre : clear session + retour racine app/ (redirigera vers /login). */
export async function signOut() {
  await supabase.auth.signOut()
}
