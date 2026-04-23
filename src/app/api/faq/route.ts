import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FaqRow {
  id: string
  category: string
  question: string
  answer: string
  search_keywords: string[]
  view_count: number
  helpful_count: number
  priority: number
}

const MAX_RESULTS = 50

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')?.trim() || null
  const rawQuery = url.searchParams.get('q')?.trim() || ''
  const q = normalise(rawQuery)

  const admin = createServiceClient()
  let query = admin
    .from('faq_articles')
    .select('id, category, question, answer, search_keywords, view_count, helpful_count, priority')
    .eq('active', true)
    .order('priority', { ascending: true })
    .order('view_count', { ascending: false })
    .limit(MAX_RESULTS)

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger la FAQ. Réessaie dans un instant.' },
      { status: 500 },
    )
  }

  const rows: FaqRow[] = (data ?? []) as FaqRow[]

  const filtered = q
    ? rows.filter((row) => {
        const haystack = normalise(
          `${row.question} ${row.answer} ${(row.search_keywords ?? []).join(' ')}`,
        )
        return haystack.includes(q)
      })
    : rows

  const categoriesOrder: string[] = []
  const counts: Record<string, number> = {}
  for (const row of rows) {
    if (!counts[row.category]) {
      counts[row.category] = 0
      categoriesOrder.push(row.category)
    }
    counts[row.category] += 1
  }

  return NextResponse.json({
    articles: filtered,
    total: filtered.length,
    categories: categoriesOrder.map((slug) => ({ slug, count: counts[slug] })),
  })
}
