'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import ErrorState from '@/components/ui/ErrorState'
import { cn, formatDate, getInitials } from '@/lib/utils'

interface ProfileData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  theme: string | null
  locale: string
  birthdate: string | null
  notifications_enabled: boolean
  plan: string | null
  purama_points: number | null
  xp: number | null
  level: number | null
  streak_days: number | null
  created_at: string
}

const THEME_OPTIONS = [
  { value: 'dark', label: 'Sombre' },
  { value: 'light', label: 'Clair' },
  { value: 'oled', label: 'OLED (pur noir)' },
] as const

const LOCALE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ar', label: 'العربية' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ru', label: 'Русский' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'sv', label: 'Svenska' },
] as const

export default function ProfilePage() {
  const { loading: authLoading, user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [theme, setTheme] = useState<string>('dark')
  const [locale, setLocale] = useState<string>('fr')
  const [birthdate, setBirthdate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' })
      if (!res.ok) {
        setError('Impossible de charger ton profil. Réessaie.')
        setLoading(false)
        return
      }
      const body = await res.json()
      const p: ProfileData = body.profile
      setProfile(p)
      setFullName(p.full_name ?? '')
      setTheme(p.theme ?? 'dark')
      setLocale(p.locale ?? 'fr')
      setBirthdate(p.birthdate ?? '')
    } catch {
      setError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchProfile()
  }, [user, fetchProfile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const payload: Record<string, string | null | boolean> = {}
    if (fullName.trim() !== (profile.full_name ?? '')) payload.full_name = fullName.trim()
    if (theme !== (profile.theme ?? 'dark')) payload.theme = theme
    if (locale !== profile.locale) payload.locale = locale
    if (birthdate !== (profile.birthdate ?? '')) payload.birthdate = birthdate || null

    if (Object.keys(payload).length === 0) {
      setSaveError('Aucun changement à enregistrer.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? 'Mise à jour impossible.')
        setSaving(false)
        return
      }
      setProfile(data.profile)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Erreur réseau. Réessaie.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message="Session expirée. Reconnecte-toi pour voir ton profil." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <UserRound className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
          Mon profil
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ton identité sur YANA. Les infos sensibles (email, mot de passe) se gèrent dans les réglages du compte.
        </p>
      </header>

      {loading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProfile} />
      ) : profile ? (
        <>
          <section className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--cyan)] to-[var(--purple)] font-[family-name:var(--font-display)] text-2xl font-bold text-white"
                aria-hidden
              >
                {getInitials(profile.full_name ?? profile.email)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
                  {profile.full_name ?? 'Ajoute ton nom'}
                </p>
                <p className="truncate text-sm text-[var(--text-secondary)]">{profile.email}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Membre depuis le {formatDate(profile.created_at)} · Plan {profile.plan ?? 'free'}
                </p>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="glass flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Informations personnelles</h2>

            <Input
              label="Nom complet"
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ton prénom et nom"
              autoComplete="name"
              disabled={saving}
              data-testid="profile-full-name"
            />

            <Input
              label="Date de naissance"
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              disabled={saving}
              data-testid="profile-birthdate"
            />
            <p className="-mt-2 text-xs text-[var(--text-muted)]">
              Utilisée pour l&apos;anniversaire et les vœux personnalisés. Minimum 13 ans.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="theme" className="text-sm text-[var(--text-secondary)]">Thème</label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                disabled={saving}
                className={cn(
                  'w-full rounded-xl border bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none',
                  'focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]/30 border-[var(--border)]',
                )}
                data-testid="profile-theme"
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="locale" className="text-sm text-[var(--text-secondary)]">Langue</label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                disabled={saving}
                className={cn(
                  'w-full rounded-xl border bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none',
                  'focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]/30 border-[var(--border)]',
                )}
                data-testid="profile-locale"
              >
                {LOCALE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Profil mis à jour.</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving}
                data-testid="profile-save"
              >
                Enregistrer
              </Button>
            </div>
          </form>

          <section className="glass grid grid-cols-3 gap-4 rounded-2xl p-5 sm:p-6">
            <Stat label="Niveau" value={String(profile.level ?? 1)} />
            <Stat label="XP" value={(profile.xp ?? 0).toLocaleString('fr-FR')} />
            <Stat label="Streak" value={`${profile.streak_days ?? 0} j`} />
          </section>
        </>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
    </div>
  )
}
