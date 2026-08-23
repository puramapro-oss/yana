import { formatDateTime } from '@/lib/utils'
import type { Purchase, ShopItem } from '../types'

interface PurchaseHistoryProps {
  purchases: Purchase[]
  items: ShopItem[]
}

export default function PurchaseHistory({ purchases, items }: PurchaseHistoryProps) {
  if (purchases.length === 0) return null

  return (
    <section aria-labelledby="history-title" className="glass rounded-2xl p-5 sm:p-6">
      <h2 id="history-title" className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
        Historique
      </h2>
      <ul className="flex flex-col gap-2">
        {purchases.slice(0, 10).map((p) => {
          const item = items.find((i) => i.id === p.item_id)
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[var(--text-primary)]">{item?.name ?? 'Article'}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatDateTime(p.created_at)}
                  {p.coupon_code && ` · code ${p.coupon_code}`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[var(--text-primary)]">
                −{p.points_spent.toLocaleString('fr-FR')} pts
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
