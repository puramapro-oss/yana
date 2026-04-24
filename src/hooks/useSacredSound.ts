'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  disableSound,
  enableSound,
  isSoundEnabled,
  playBowl,
} from '@/lib/sacred-sound'

/**
 * Hook client — état du toggle sons 432Hz + action toggle + play bol tibétain.
 * À utiliser dans composants client seulement.
 */
export function useSacredSound() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setEnabled(isSoundEnabled())
  }, [])

  const toggle = useCallback(async () => {
    setBusy(true)
    try {
      if (enabled) {
        disableSound()
        setEnabled(false)
      } else {
        await enableSound()
        setEnabled(true)
      }
    } finally {
      setBusy(false)
    }
  }, [enabled])

  return { enabled, busy, toggle, playBowl }
}
