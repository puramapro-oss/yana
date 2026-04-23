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
