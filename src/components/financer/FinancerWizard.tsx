'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StepProgress from './StepProgress'
import StepProfil from './StepProfil'
import StepSituation from './StepSituation'
import StepRegion from './StepRegion'
import StepResults from './StepResults'
import {
  isProfilKey,
  isRegionKey,
  parseSituationsCSV,
  type ProfilKey,
  type RegionKey,
  type SituationKey,
} from '@/lib/aides-catalog'
import type { Aide } from '@/types'

type Step = 1 | 2 | 3 | 4

interface AidesResponse {
  aides: Aide[]
  count: number
  totalEur: number
}

function readStep(raw: string | null): Step {
  const n = parseInt(raw ?? '1', 10)
  if (n === 2 || n === 3 || n === 4) return n
  return 1
}

export default function FinancerWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialProfil = isProfilKey(searchParams.get('profil')) ? (searchParams.get('profil') as ProfilKey) : null
  const initialRegion = isRegionKey(searchParams.get('region')) ? (searchParams.get('region') as RegionKey) : null
  const initialSituations = parseSituationsCSV(searchParams.get('situations'))

  const [step, setStep] = useState<Step>(readStep(searchParams.get('step')))
  const [profil, setProfil] = useState<ProfilKey | null>(initialProfil)
  const [situations, setSituations] = useState<SituationKey[]>(initialSituations)
  const [region, setRegion] = useState<RegionKey | null>(initialRegion)

  const [results, setResults] = useState<AidesResponse | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)

  // Sync URL sans re-render côté server (replace, pas push)
  const syncUrl = useCallback(
    (params: { step?: Step; profil?: ProfilKey | null; situations?: SituationKey[]; region?: RegionKey | null }) => {
      const next = new URLSearchParams()
      const s = params.step ?? step
      const p = params.profil !== undefined ? params.profil : profil
      const r = params.region !== undefined ? params.region : region
      const sits = params.situations !== undefined ? params.situations : situations
      if (s > 1) next.set('step', String(s))
      if (p) next.set('profil', p)
      if (sits.length > 0) next.set('situations', sits.join(','))
      if (r) next.set('region', r)
      const qs = next.toString()
      router.replace(qs ? `/financer?${qs}` : '/financer', { scroll: false })
    },
    [router, step, profil, region, situations],
  )

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    if (profil) params.set('profil', profil)
    if (region) params.set('region', region)
    if (situations.length > 0) params.set('situations', situations.join(','))
    return params.toString()
  }, [profil, region, situations])

  const fetchResults = useCallback(async () => {
    setResultsLoading(true)
    setResultsError(null)
    try {
      const qs = buildQueryParams()
      const res = await fetch(`/api/aides${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
      if (!res.ok) {
        setResultsError('Impossible de charger les aides. Réessaie.')
        setResultsLoading(false)
        return
      }
      const data: AidesResponse = await res.json()
      setResults(data)
    } catch {
      setResultsError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setResultsLoading(false)
    }
  }, [buildQueryParams])

  // Fetch auto dès qu'on atteint étape 4
  useEffect(() => {
    if (step === 4) {
      fetchResults()
    }
  }, [step, fetchResults])

  const handleProfilSelect = (p: ProfilKey) => {
    setProfil(p)
    syncUrl({ profil: p })
  }

  const handleSituationToggle = (s: SituationKey) => {
    const next = situations.includes(s) ? situations.filter((x) => x !== s) : [...situations, s]
    setSituations(next)
    syncUrl({ situations: next })
  }

  const handleRegionSelect = (r: RegionKey) => {
    setRegion(r)
    syncUrl({ region: r })
  }

  const goStep = (s: Step) => {
    setStep(s)
    syncUrl({ step: s })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleRestart = () => {
    setProfil(null)
    setSituations([])
    setRegion(null)
    setResults(null)
    setStep(1)
    router.replace('/financer', { scroll: false })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const content = useMemo(() => {
    switch (step) {
      case 1:
        return (
          <StepProfil
            selected={profil}
            onSelect={handleProfilSelect}
            onNext={() => goStep(2)}
          />
        )
      case 2:
        return (
          <StepSituation
            selected={situations}
            onToggle={handleSituationToggle}
            onNext={() => goStep(3)}
            onBack={() => goStep(1)}
          />
        )
      case 3:
        return (
          <StepRegion
            selected={region}
            onSelect={handleRegionSelect}
            onNext={() => goStep(4)}
            onBack={() => goStep(2)}
          />
        )
      case 4:
        return (
          <StepResults
            profil={profil}
            region={region}
            situations={situations}
            aides={results?.aides ?? null}
            totalEur={results?.totalEur ?? 0}
            loading={resultsLoading}
            error={resultsError}
            onBack={() => goStep(3)}
            onRestart={handleRestart}
            onRetry={fetchResults}
          />
        )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, profil, situations, region, results, resultsLoading, resultsError])

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <StepProgress current={step} />
      <div className="glass rounded-2xl p-5 sm:p-8">{content}</div>
    </div>
  )
}
