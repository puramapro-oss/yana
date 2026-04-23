'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GuideSection {
  id: string
  icon: LucideIcon
  title: string
  summary: string
  paragraphs: string[]
}

interface GuideAccordionProps {
  sections: GuideSection[]
  defaultOpenId?: string
}

export default function GuideAccordion({ sections, defaultOpenId }: GuideAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null)

  return (
    <ul className="flex flex-col gap-2">
      {sections.map((s) => {
        const open = openId === s.id
        const Icon = s.icon
        return (
          <li key={s.id} className="glass overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.id)}
              className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
              aria-expanded={open}
              aria-controls={`panel-${s.id}`}
              data-testid={`guide-section-${s.id}`}
            >
              <div
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                  open
                    ? 'bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--purple)]/20 text-[var(--cyan)]'
                    : 'bg-white/5 text-[var(--text-secondary)]',
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)] sm:text-sm">{s.summary}</p>
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform',
                  open && 'rotate-180 text-[var(--text-primary)]',
                )}
                aria-hidden
              />
            </button>
            {open && (
              <div
                id={`panel-${s.id}`}
                role="region"
                className="border-t border-[var(--border)] px-5 py-4 text-sm leading-relaxed text-[var(--text-secondary)]"
              >
                {s.paragraphs.map((p, i) => (
                  <p key={i} className={i > 0 ? 'mt-3' : ''}>{p}</p>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
