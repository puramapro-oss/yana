interface CheckboxCardProps {
  checked: boolean
  onChange: (v: boolean) => void
  emoji: string
  label: string
}

export default function CheckboxCard({ checked, onChange, emoji, label }: CheckboxCardProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition ${
        checked
          ? 'border-[var(--cyan)]/60 bg-[var(--cyan)]/5 text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)] hover:border-[var(--border-glow)]'
      }`}
    >
      <span className="text-xl" aria-hidden>
        {emoji}
      </span>
      <span>{label}</span>
    </button>
  )
}
