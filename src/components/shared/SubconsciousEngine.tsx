'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { routeFrequency } from '@/hooks/useEmpowerment'

/**
 * P6.C4 — SubconsciousEngine
 * Orchestrateur client-only. Trois responsabilités :
 *  1. Injecter un layer fixed fullscreen .subconscious-flower (fleur de vie 3% opacity)
 *  2. Poser data-frequency sur le <main> du dashboard selon la route
 *  3. Marquer <html class="subconscious-ready"> pour éviter le FOUC transitions
 *
 * Aucun changement visuel breaking : tout est additif, pointer-events:none,
 * z-index 0, respect prefers-reduced-motion (géré via CSS @media).
 */
export default function SubconsciousEngine() {
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    // Marque <html> prêt pour les transitions (évite le flash au 1er mount)
    document.documentElement.classList.add('subconscious-ready')
  }, [])

  useEffect(() => {
    const freq = routeFrequency(pathname)
    // Cible le <main> du layout dashboard.
    // Fallback silencieux si absent (pas de throw, pas de log).
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.setAttribute('data-frequency', String(freq))
    }
    return () => {
      if (mainEl) {
        mainEl.removeAttribute('data-frequency')
      }
    }
  }, [pathname])

  return <div className="subconscious-flower" aria-hidden="true" />
}
