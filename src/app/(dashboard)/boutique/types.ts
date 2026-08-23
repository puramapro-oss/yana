import type { LucideIcon } from 'lucide-react'
import { Percent, Gift, Wallet, TrendingUp, Sparkles, Ticket } from 'lucide-react'

export interface ShopItem {
  id: string
  slug: string
  category: string
  name: string
  description: string
  cost_points: number
  item_type: string
  value_cents: number | null
  discount_percent: number | null
  duration_days: number | null
  target_plan: string | null
  sort_order: number
}

export interface Purchase {
  id: string
  item_id: string
  points_spent: number
  coupon_code: string | null
  expires_at: string | null
  created_at: string
}

export interface ItemsResponse {
  items: ShopItem[]
  balance: number
  purchases: Purchase[]
}

export interface RedeemResult {
  itemName: string
  itemType: string
  couponCode: string | null
  balance: number
}

export const ITEM_TYPE_ICON: Record<string, LucideIcon> = {
  discount_coupon: Percent,
  free_month: Gift,
  cash_credit: Wallet,
  referral_boost: TrendingUp,
  feature_unlock: Sparkles,
  ticket: Ticket,
}
