import { createServiceClient } from './supabase'

export const REF_COOKIE_NAME = 'yana_ref'

// Attache un nouvel utilisateur à son parrain si un cookie yana_ref valide existe.
// Idempotent : ne fait rien si une ligne referrals existe déjà pour ce referred_id.
// Retourne true si attribution effectuée, false sinon.
export async function attributeReferral(params: {
  referredUserId: string
  referralCode: string | undefined | null
  ipHash?: string | null
}): Promise<boolean> {
  const { referredUserId, referralCode, ipHash } = params
  if (!referralCode) return false

  const code = referralCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{4,16}$/.test(code)) return false

  const admin = createServiceClient()

  const { data: referrer } = await admin
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .single()

  if (!referrer) return false
  if (referrer.id === referredUserId) return false

  const { data: existing } = await admin
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .maybeSingle()

  if (existing) return false

  const { error } = await admin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    ip_hash: ipHash ?? null,
    status: 'pending',
    tier: 1,
  })

  return !error
}
