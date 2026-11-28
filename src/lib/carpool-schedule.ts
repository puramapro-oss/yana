export function upcomingDepartures(dates: string[], time: string, now = Date.now()): string[] {
  if (!/^\d{2}:\d{2}$/.test(time) || !dates.length) throw new Error('Choisis une date et une heure pour chaque départ.')
  const timestamps = dates.map(date => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Complète la date de chaque départ.')
    const local = new Date(`${date}T${time}:00`)
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    if (local.getFullYear() !== year || local.getMonth() + 1 !== month || local.getDate() !== day ||
        local.getHours() !== hour || local.getMinutes() !== minute) {
      throw new Error('Cette heure locale est indisponible pour l’une des dates. Choisis une autre heure.')
    }
    if (local.getTime() < now + 30 * 60_000) throw new Error('Chaque départ doit être dans au moins 30 minutes.')
    return local.toISOString()
  })
  if (new Set(timestamps).size !== timestamps.length) throw new Error('Deux départs ont la même date.')
  return timestamps.sort()
}

/** Increment the calendar date independently of daylight saving transitions. */
export function followingWeek(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  const utc = new Date(`${date}T12:00:00Z`)
  if (!Number.isFinite(utc.getTime())) return ''
  utc.setUTCDate(utc.getUTCDate() + 7)
  return utc.toISOString().slice(0, 10)
}
