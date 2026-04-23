'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

interface CountdownProps {
  target: string // ISO date
  label: string
}

function split(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return { days, hours, minutes, secs }
}

export default function Countdown({ target, label }: CountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)),
  )

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [target])

  const { days, hours, minutes, secs } = split(secondsLeft)

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <Timer className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 font-[family-name:var(--font-display)] tabular-nums">
        <Unit value={days} label="j" />
        <Separator />
        <Unit value={hours} label="h" />
        <Separator />
        <Unit value={minutes} label="m" />
        <Separator />
        <Unit value={secs} label="s" />
      </div>
    </div>
  )
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
    </div>
  )
}

function Separator() {
  return <span className="text-lg text-[var(--text-muted)]">·</span>
}
