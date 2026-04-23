'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Theme } from '@/types'

const STORAGE_KEY = 'yana_theme'
const VALID_THEMES: Theme[] = ['dark', 'light', 'oled']

function isValidTheme(t: string | null): t is Theme {
  return !!t && VALID_THEMES.includes(t as Theme)
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  // Color hint pour les barres mobiles iOS/Android
  const themeColor = t === 'light' ? '#f8fafc' : t === 'oled' ? '#000000' : '#03040a'
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', themeColor)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isValidTheme(stored)) {
      setThemeState(stored)
      applyTheme(stored)
    } else {
      applyTheme('dark')
    }
    setHydrated(true)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    applyTheme(t)
    // Persist DB (fire-and-forget, silencieux si pas authentifié — PATCH renverra 401)
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {
      // ignore : localStorage reste la source de vérité côté client
    })
  }, [])

  const cycleTheme = useCallback(() => {
    const idx = VALID_THEMES.indexOf(theme)
    const next = VALID_THEMES[(idx + 1) % VALID_THEMES.length]
    setTheme(next)
  }, [theme, setTheme])

  return { theme, setTheme, cycleTheme, hydrated }
}
