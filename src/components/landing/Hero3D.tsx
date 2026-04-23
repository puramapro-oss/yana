'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Fallback gradient CSS — paint instantanément (LCP friendly).
// Garde des couleurs identiques à la scène 3D pour transition invisible.
function GradientFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(249,115,22,0.22), transparent 60%), radial-gradient(ellipse 80% 60% at 50% 10%, rgba(14,165,233,0.14), transparent 60%), #03040a',
      }}
    />
  )
}

// R3F Canvas ne peut pas être SSR — window absent. dynamic ssr:false + montage différé post-LCP
// via requestIdleCallback pour ne pas bloquer le first paint / TTI.
const Hero3DScene = dynamic(() => import('./Hero3DScene'), {
  ssr: false,
  loading: () => <GradientFallback />,
})

export default function Hero3D() {
  const [mountCanvas, setMountCanvas] = useState(false)

  useEffect(() => {
    // Progressive enhancement : la scène 3D est plaisir visuel, pas contenu critique.
    // On la monte après le premier paint + une idle window, pour LCP/TBT propres.
    // Fallback setTimeout si requestIdleCallback absent (Safari iOS < 16.4).
    type IdleCB = (cb: () => void, opts?: { timeout?: number }) => number
    const w = window as Window &
      typeof globalThis & { requestIdleCallback?: IdleCB }
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 700))
    const id = schedule(() => setMountCanvas(true), { timeout: 2000 })
    return () => {
      const cancel =
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback ??
        clearTimeout
      cancel(id as number)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ contain: 'strict' }}
    >
      {mountCanvas ? <Hero3DScene /> : <GradientFallback />}
      {/* vignette douce bottom pour que le texte homepage reste lisible */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'linear-gradient(to top, rgba(3,4,10,0.92), rgba(3,4,10,0.55) 50%, transparent)',
        }}
      />
    </div>
  )
}
