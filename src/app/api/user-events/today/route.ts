import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('birthdate, created_at, full_name')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  }

  const today = new Date()
  const todayMonth = today.getUTCMonth() + 1
  const todayDay = today.getUTCDate()
  const todayYear = today.getUTCFullYear()

  const events: Array<{
    type: 'birthday' | 'signup_anniversary'
    title: string
    message: string
    yearsCount: number
  }> = []

  // Birthday check
  if (profile.birthdate) {
    const [bYear, bMonth, bDay] = profile.birthdate.split('-').map(Number)
    if (bMonth === todayMonth && bDay === todayDay) {
      const age = todayYear - bYear
      events.push({
        type: 'birthday',
        title: `Joyeux anniversaire, ${profile.full_name ?? 'ami·e'} !`,
        message: age > 0 && age < 120
          ? `Tu as ${age} ans aujourd'hui. YANA te fête +500 pts.`
          : `YANA te fête +500 pts.`,
        yearsCount: Math.max(1, age),
      })
    }
  }

  // Signup anniversary check (même jour/mois que created_at, année différente)
  if (profile.created_at) {
    const created = new Date(profile.created_at)
    const cMonth = created.getUTCMonth() + 1
    const cDay = created.getUTCDate()
    const cYear = created.getUTCFullYear()
    if (cMonth === todayMonth && cDay === todayDay && cYear < todayYear) {
      const years = todayYear - cYear
      events.push({
        type: 'signup_anniversary',
        title: `${years} an${years > 1 ? 's' : ''} sur YANA 🎉`,
        message: `Merci pour ta confiance. +${years * 100} pts.`,
        yearsCount: years,
      })
    }
  }

  return NextResponse.json({ events })
}
