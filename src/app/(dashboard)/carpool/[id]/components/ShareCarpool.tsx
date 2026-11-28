'use client'

import { useState } from 'react'

export default function ShareCarpool({ carpoolId }: { carpoolId: string }) {
  const [copied, setCopied] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  async function copyLink() {
    const url = new URL(`/carpool/${encodeURIComponent(carpoolId)}`, window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setManualUrl('')
      setCopied(true)
    } catch {
      setManualUrl(url)
      setCopied(false)
    }
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={copyLink} className="text-sm text-[var(--cyan)] underline">
        Copier le lien du trajet
      </button>
      {copied && <p role="status" className="text-sm">Lien copié.</p>}
      {manualUrl && (
        <label className="block text-sm">
          Lien à copier
          <input readOnly value={manualUrl} onFocus={event => event.target.select()}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-2 py-1" />
        </label>
      )}
    </div>
  )
}
