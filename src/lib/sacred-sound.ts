// Singleton ambiance sonore spirituelle — 432Hz pentatonique + bol tibétain.
// Client-only. Lazy import Howler (≈30KB) pour ne pas charger sur première page.
// Respecte la politique autoplay : la boucle ne démarre qu'après un geste utilisateur
// (toggle explicite OU unlock via SpiritualLayer après premier pointerdown/keydown).

const LOOP_SRC = '/sounds/432hz-pentatonic.wav'
const BOWL_SRC = '/sounds/tibetan-bowl.wav'
const ENABLED_KEY = 'yana-spiritual-sound-enabled'
const LOOP_VOLUME = 0.22

type HowlType = import('howler').Howl
type HowlCtor = typeof import('howler').Howl

let loopInstance: HowlType | null = null
let bowlInstance: HowlType | null = null
let loadingPromise: Promise<void> | null = null

async function ensureHowler(): Promise<void> {
  if (loopInstance && bowlInstance) return
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    const mod = await import('howler')
    const Howl: HowlCtor = mod.Howl
    if (!loopInstance) {
      loopInstance = new Howl({
        src: [LOOP_SRC],
        loop: true,
        volume: 0,
        html5: false,
        preload: true,
      })
    }
    if (!bowlInstance) {
      bowlInstance = new Howl({
        src: [BOWL_SRC],
        loop: false,
        volume: 0.55,
        html5: false,
        preload: true,
      })
    }
  })()
  return loadingPromise
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

function persistEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    // localStorage bloqué — on accepte la perte de persistence
  }
}

export async function enableSound(): Promise<void> {
  persistEnabled(true)
  await ensureHowler()
  if (loopInstance && !loopInstance.playing()) {
    loopInstance.volume(0)
    loopInstance.play()
    loopInstance.fade(0, LOOP_VOLUME, 2500)
  }
}

export function disableSound(): void {
  persistEnabled(false)
  if (loopInstance && loopInstance.playing()) {
    const current = loopInstance.volume()
    loopInstance.fade(current, 0, 1200)
    const instance = loopInstance
    setTimeout(() => {
      try {
        instance.stop()
      } catch {
        // Howler peut throw si déjà unload — silencieux
      }
    }, 1300)
  }
}

export async function resumeLoopIfEnabled(): Promise<void> {
  if (!isSoundEnabled()) return
  await ensureHowler()
  if (loopInstance && !loopInstance.playing()) {
    loopInstance.volume(0)
    loopInstance.play()
    loopInstance.fade(0, LOOP_VOLUME, 2500)
  }
}

export async function playBowl(): Promise<void> {
  if (!isSoundEnabled()) return
  await ensureHowler()
  bowlInstance?.play()
}
