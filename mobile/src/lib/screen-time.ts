/**
 * screen-time.ts — abstraction No-Phone-While-Driving.
 *
 * Contrainte OS (§36.4 CLAUDE.md) :
 *  - iOS : aucun accès "current foreground app" pour les apps tierces (privacy).
 *    La seule surface utilisable est FamilyControls / DeviceActivity → shield
 *    qui bloque des apps sélectionnées (extension Swift — scope P7.C).
 *  - Android : UsageStatsManager donne l'app en foreground SI l'utilisateur
 *    accorde PACKAGE_USAGE_STATS dans les réglages système (intent spécial).
 *
 * Stratégie MVP B4 (sans extension native iOS, sans permission système Android) :
 *  - Heuristique cross-platform via AppState : pendant un trajet actif, si
 *    l'app passe en `background` pendant > 5 secondes, on compte un
 *    `phone_use` (severity 3) dans la queue events + local notif de rappel.
 *  - Opt-in explicite (toggle Settings, off par défaut) stocké dans
 *    AsyncStorage (STORAGE_KEYS.NO_PHONE_WHILE_DRIVING).
 *  - Sur iOS, on requête quand même `FamilyControls.requestAuthorization`
 *    pour pouvoir activer un Shield via extension plus tard (P7.C).
 *    Si refus / erreur : l'heuristique AppState reste la bascule active.
 */
import { AppState, type AppStateStatus, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from './constants'
import { enqueueEvent } from './event-queue'
import type { DetectedEventPayload } from './trip-api'

const BACKGROUND_GRACE_MS = 5_000
const MAX_PHONE_USE_EVENTS_PER_HOUR = 12

export interface PhoneUseWatcherCallbacks {
  onPhoneUse?: (event: DetectedEventPayload) => void
  onNotifySuggestion?: (durationMs: number) => void
}

export async function isNoPhoneEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.NO_PHONE_WHILE_DRIVING)
    return val === 'true'
  } catch {
    return false
  }
}

export async function setNoPhoneEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NO_PHONE_WHILE_DRIVING, enabled ? 'true' : 'false')
  } catch {
    // Best-effort — l'utilisateur peut retoggle.
  }
}

export type AuthStatus = 'granted' | 'denied' | 'unavailable' | 'not_requested'

/**
 * Demande l'autorisation native :
 *  - iOS : FamilyControls.requestAuthorization via react-native-device-activity
 *  - Android : ouvre ACTION_USAGE_ACCESS_SETTINGS (si lib dispo, sinon unavailable)
 *
 * Le retour ne bloque rien : même `denied`, l'AppState-heuristic reste
 * opérationnelle. L'auth native sert pour les features shield (P7.C).
 */
export async function requestScreenTimeAuth(): Promise<AuthStatus> {
  if (Platform.OS === 'ios') {
    try {
      const DeviceActivity = require('react-native-device-activity') as {
        requestAuthorization?: (
          forIndividualOrChild?: 'individual' | 'child',
        ) => Promise<void>
      }
      if (!DeviceActivity.requestAuthorization) return 'unavailable'
      await DeviceActivity.requestAuthorization('individual')
      return 'granted'
    } catch {
      return 'denied'
    }
  }
  // Android : MVP n'ouvre pas ACTION_USAGE_ACCESS_SETTINGS (intent), on laisse
  // l'heuristique AppState faire le travail. P7.C peut ajouter la permission
  // manuelle si le besoin d'un foreground-app detection exact apparaît.
  return 'unavailable'
}

/**
 * Watcher AppState — à démarrer uniquement pendant un trajet actif.
 * Retourne `stop()` à appeler à la fin du trajet (stop, cancel).
 *
 * Logique :
 *  - app → background : on note l'instant `enteredBgAt`
 *  - app → active dans < 5 s : ignoré (notification, context-switch rapide)
 *  - app → active après ≥ 5 s : phone_use event sévérité 3
 *  - rate-limit : max 12 events/heure pour éviter le spam si user toggle
 *    continuellement (utilise cooldown glissant)
 */
export function startPhoneUseWatcher(cbs: PhoneUseWatcherCallbacks): () => void {
  let enteredBgAt: number | null = null
  const recentEventsMs: number[] = []

  const handler = (status: AppStateStatus) => {
    const now = Date.now()
    if (status === 'background' || status === 'inactive') {
      if (enteredBgAt === null) enteredBgAt = now
      return
    }
    if (status === 'active' && enteredBgAt !== null) {
      const elapsed = now - enteredBgAt
      enteredBgAt = null
      if (elapsed < BACKGROUND_GRACE_MS) return

      // Rate-limit : conserver seulement les events de la dernière heure.
      const oneHourAgo = now - 3_600_000
      while (recentEventsMs.length > 0 && recentEventsMs[0] < oneHourAgo) {
        recentEventsMs.shift()
      }
      if (recentEventsMs.length >= MAX_PHONE_USE_EVENTS_PER_HOUR) return
      recentEventsMs.push(now)

      const severity = elapsed > 30_000 ? 5 : elapsed > 15_000 ? 4 : 3
      const event: DetectedEventPayload = {
        event_type: 'phone_use',
        severity,
        speed_kmh: null,
        speed_limit_kmh: null,
        g_force: null,
        lat_rounded: null,
        lng_rounded: null,
        occurred_at: new Date(now - elapsed).toISOString(),
      }
      enqueueEvent(event)
      cbs.onPhoneUse?.(event)
      cbs.onNotifySuggestion?.(elapsed)
    }
  }

  const sub = AppState.addEventListener('change', handler)
  return () => {
    sub.remove()
  }
}

/** Version testable de la logique de classification severity. */
export function severityFromBackgroundMs(elapsedMs: number): number {
  if (elapsedMs < BACKGROUND_GRACE_MS) return 0
  if (elapsedMs > 30_000) return 5
  if (elapsedMs > 15_000) return 4
  return 3
}
