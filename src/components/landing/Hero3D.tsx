'use client'

import dynamic from 'next/dynamic'

// R3F Canvas ne peut pas être SSR — window absent. dynamic ssr:false + fallback gradient pur CSS
// pour garder une belle impression pendant le chargement de three.js (~100ko gzip)
const Hero3DScene = dynamic(() => import('./Hero3DScene'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 70% 50% at 50% 70%, rgba(249,115,22,0.22), transparent 60%), radial-gradient(ellipse 80% 60% at 50% 10%, rgba(14,165,233,0.14), transparent 60%), #03040a',
      }}
    />
  ),
})

export default function Hero3D() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ contain: 'strict' }}
    >
      <Hero3DScene />
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
