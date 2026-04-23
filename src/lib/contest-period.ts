// Helpers calcul des périodes concours/tirages
// Règles CLAUDE.md : classement hebdo reset dim 23h59 · tirage mensuel dernier jour

export function getCurrentWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
  // Semaine = lundi 00:00 → dimanche 23:59:59 (Europe/Paris logique, on utilise UTC des calculs)
  const d = new Date(now)
  const day = d.getUTCDay() // 0=dim, 1=lun, ... 6=sam
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMonday, 0, 0, 0))
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000)
  return { start, end }
}

export function getCurrentMonthBounds(now: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(now)
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0) - 1000)
  return { start, end }
}

export function secondsUntil(target: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
}

// Format YYYY-MM-DD en UTC depuis une Date.
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Période hebdo (lundi → dimanche) au format string YYYY-MM-DD,
// compatible avec la colonne `date` PostgreSQL.
export function getWeeklyPeriod(now: Date = new Date()): { start: string; end: string } {
  const { start, end } = getCurrentWeekBounds(now)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

// Période mensuelle (1er → dernier jour) au format string YYYY-MM-DD.
export function getMonthlyPeriod(now: Date = new Date()): { start: string; end: string } {
  const { start, end } = getCurrentMonthBounds(now)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}
