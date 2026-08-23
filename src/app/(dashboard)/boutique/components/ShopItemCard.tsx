import { Gift } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ShopItem } from '../types'
import { ITEM_TYPE_ICON } from '../types'

interface ShopItemCardProps {
  item: ShopItem
  balance: number
  isPending: boolean
  onRedeem: (slug: string) => void
}

export default function ShopItemCard({ item, balance, isPending, onRedeem }: ShopItemCardProps) {
  const Icon = ITEM_TYPE_ICON[item.item_type] ?? Gift
  const canAfford = balance >= item.cost_points
  const pct = Math.min(100, Math.round((balance / item.cost_points) * 100))

  return (
    <article
      className="glass flex flex-col gap-3 rounded-2xl p-5 sm:p-6"
      data-testid={`shop-item-${item.slug}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
            canAfford
              ? 'bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--purple)]/20 text-[var(--cyan)]'
              : 'bg-white/5 text-[var(--text-muted)]',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--text-primary)]">{item.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.description}</p>
        </div>
      </div>

      {!canAfford && (
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>Progression</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-primary)]">
          {item.cost_points.toLocaleString('fr-FR')}
          <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">pts</span>
        </p>
        <Button
          variant={canAfford ? 'primary' : 'secondary'}
          size="sm"
          loading={isPending}
          disabled={!canAfford || isPending}
          onClick={() => onRedeem(item.slug)}
          data-testid={`redeem-${item.slug}`}
        >
          {canAfford ? 'Échanger' : 'Verrouillé'}
        </Button>
      </div>
    </article>
  )
}
