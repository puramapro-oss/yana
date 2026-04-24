/**
 * health.ts — abstraction cross-platform Apple HealthKit + Android Health Connect.
 *
 * Pattern §36.3 CLAUDE.md (remplace Terra API).
 *
 * Rôle YANA : calcul d'un FatigueSignal (0..3) avant démarrage d'un trajet.
 * Si niveau ≥ 2 → modal bloquante "Repose-toi" (NAMA-PILOTE).
 *
 * Sources de données :
 *  - iOS : HealthKit — SleepAnalysis (asleep), HeartRateVariabilitySDNN
 *  - Android : Health Connect — SleepSessionRecord, HeartRateVariabilityRmssdRecord
 *
 * Heuristique fatigue (niveaux 0..3) :
 *  - 0 sereine : sleep ≥ 7h30 ET hrv ≥ 50 ms (si dispo)
 *  - 1 ok      : sleep 6h30-7h30 OU hrv 35-50 ms
 *  - 2 vigilant: sleep 5h-6h30 OU hrv 20-35 ms
 *  - 3 risqué  : sleep < 5h OU hrv < 20 ms
 *
 * Fallback : si aucune donnée dispo (lib absente / device sans santé / refus
 * permissions) → level = 0 neutre + source='none', pas de modal bloquante.
 */
import { Platform } from 'react-native'

export type FatigueLevel = 0 | 1 | 2 | 3
export type FatigueSource = 'healthkit' | 'health_connect' | 'none'

export interface FatigueSignal {
  level: FatigueLevel
  hrv_ms: number | null
  sleep_hours: number | null
  source: FatigueSource
}

export const FATIGUE_NEUTRAL: FatigueSignal = {
  level: 0,
  hrv_ms: null,
  sleep_hours: null,
  source: 'none',
}

function levelFromSleepAndHrv(sleepHours: number | null, hrvMs: number | null): FatigueLevel {
  let level: FatigueLevel = 0
  if (sleepHours !== null) {
    if (sleepHours < 5) level = 3
    else if (sleepHours < 6.5) level = 2
    else if (sleepHours < 7.5) level = Math.max(level, 1) as FatigueLevel
  }
  if (hrvMs !== null) {
    let hrvLevel: FatigueLevel = 0
    if (hrvMs < 20) hrvLevel = 3
    else if (hrvMs < 35) hrvLevel = 2
    else if (hrvMs < 50) hrvLevel = 1
    if (hrvLevel > level) level = hrvLevel
  }
  return level
}

/* --------------------------------- iOS --------------------------------- */

interface HealthValue {
  startDate: string
  endDate: string
  value: number
}

async function iosRequestAndFetch(): Promise<FatigueSignal> {
  try {
    const AppleHealthKit = require('react-native-health').default as {
      Constants: { Permissions: Record<string, string> }
      initHealthKit: (
        options: { permissions: { read: string[]; write: string[] } },
        cb: (err: string, res: unknown) => void,
      ) => void
      getSleepSamples: (
        opts: { startDate: string; endDate?: string; limit?: number },
        cb: (err: string, res: HealthValue[]) => void,
      ) => void
      getHeartRateVariabilitySamples: (
        opts: { startDate: string; endDate?: string; limit?: number },
        cb: (err: string, res: HealthValue[]) => void,
      ) => void
    }

    const { Permissions } = AppleHealthKit.Constants
    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: [
              Permissions.SleepAnalysis,
              Permissions.HeartRateVariability,
              Permissions.RestingHeartRate,
            ],
            write: [],
          },
        },
        (err) => (err ? reject(new Error(err)) : resolve()),
      )
    })

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const sleepSamples = await new Promise<HealthValue[]>((resolve) => {
      AppleHealthKit.getSleepSamples({ startDate: since, limit: 20 }, (err, res) =>
        resolve(err ? [] : res ?? []),
      )
    })
    const sleepMs = sleepSamples.reduce((acc, s) => {
      const d = new Date(s.endDate).getTime() - new Date(s.startDate).getTime()
      return acc + (d > 0 ? d : 0)
    }, 0)
    const sleepHours = sleepMs > 0 ? sleepMs / 3_600_000 : null

    const hrvSamples = await new Promise<HealthValue[]>((resolve) => {
      AppleHealthKit.getHeartRateVariabilitySamples({ startDate: since, limit: 10 }, (err, res) =>
        resolve(err ? [] : res ?? []),
      )
    })
    const hrvMs = hrvSamples.length > 0
      ? Math.round(hrvSamples.reduce((a, s) => a + s.value, 0) / hrvSamples.length)
      : null

    return {
      level: levelFromSleepAndHrv(sleepHours, hrvMs),
      hrv_ms: hrvMs,
      sleep_hours: sleepHours !== null ? Math.round(sleepHours * 10) / 10 : null,
      source: 'healthkit',
    }
  } catch {
    return FATIGUE_NEUTRAL
  }
}

/* ------------------------------- Android ------------------------------- */

async function androidRequestAndFetch(): Promise<FatigueSignal> {
  try {
    const HealthConnect = require('react-native-health-connect') as {
      initialize: () => Promise<boolean>
      requestPermission: (perms: Array<{ accessType: 'read'; recordType: string }>) => Promise<unknown>
      readRecords: (
        recordType: string,
        opts: { timeRangeFilter: { operator: string; startTime: string; endTime: string } },
      ) => Promise<{ records: Array<Record<string, unknown>> }>
    }

    const ok = await HealthConnect.initialize()
    if (!ok) return FATIGUE_NEUTRAL

    await HealthConnect.requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
    ])

    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const endTime = new Date().toISOString()

    type SleepRecord = { startTime: string; endTime: string }
    const sleepRes = await HealthConnect.readRecords('SleepSession', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
    }).catch(() => ({ records: [] as SleepRecord[] }))
    const sleepMs = (sleepRes.records as unknown as SleepRecord[]).reduce((acc, r) => {
      const d = new Date(r.endTime).getTime() - new Date(r.startTime).getTime()
      return acc + (d > 0 ? d : 0)
    }, 0)
    const sleepHours = sleepMs > 0 ? sleepMs / 3_600_000 : null

    type HrvRecord = { heartRateVariabilityMillis?: number }
    const hrvRes = await HealthConnect.readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
    }).catch(() => ({ records: [] as HrvRecord[] }))
    const hrvRecords = hrvRes.records as unknown as HrvRecord[]
    const hrvValues = hrvRecords
      .map((r) => r.heartRateVariabilityMillis ?? 0)
      .filter((v) => v > 0)
    const hrvMs = hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, v) => a + v, 0) / hrvValues.length)
      : null

    return {
      level: levelFromSleepAndHrv(sleepHours, hrvMs),
      hrv_ms: hrvMs,
      sleep_hours: sleepHours !== null ? Math.round(sleepHours * 10) / 10 : null,
      source: 'health_connect',
    }
  } catch {
    return FATIGUE_NEUTRAL
  }
}

/* --------------------------------- API --------------------------------- */

/**
 * Demande les permissions santé + retourne l'état fatigue actuel.
 * Appelable idempotent : chaque appel re-demande les perms (OS cache).
 * Sur web → toujours FATIGUE_NEUTRAL.
 */
export async function getFatigueSignal(): Promise<FatigueSignal> {
  if (Platform.OS === 'ios') return iosRequestAndFetch()
  if (Platform.OS === 'android') return androidRequestAndFetch()
  return FATIGUE_NEUTRAL
}

/** Couleur d'affichage UI selon le niveau. */
export function fatigueColor(level: FatigueLevel): string {
  if (level === 0) return '#10b981'
  if (level === 1) return '#F97316'
  if (level === 2) return '#f59e0b'
  return '#ef4444'
}

/** Label court FR selon le niveau. */
export function fatigueLabel(level: FatigueLevel): string {
  if (level === 0) return 'Sereine'
  if (level === 1) return 'OK'
  if (level === 2) return 'Vigilance'
  return 'Risquée'
}

/** Message long NAMA pour modal fatigue. */
export function fatigueNamaMessage(signal: FatigueSignal): string {
  const parts: string[] = []
  if (signal.sleep_hours !== null) {
    parts.push(`Tu as dormi ${signal.sleep_hours.toFixed(1)} h cette nuit.`)
  }
  if (signal.hrv_ms !== null) {
    parts.push(`Ton HRV est à ${signal.hrv_ms} ms.`)
  }
  if (signal.level >= 2) {
    parts.push('Ton corps te dit ralentir. Un trajet mal géré coûte plus cher qu\'un report.')
  }
  return parts.join(' ')
}
