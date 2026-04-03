const STREAK_KEY = 'lesen-activity-dates'

function getActivityDates(): Set<string> {
  const raw = localStorage.getItem(STREAK_KEY)
  if (!raw) return new Set()
  try {
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveActivityDates(dates: Set<string>) {
  localStorage.setItem(STREAK_KEY, JSON.stringify([...dates]))
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Record today as an active day */
export function recordActivity() {
  const dates = getActivityDates()
  dates.add(toDateStr(new Date()))
  saveActivityDates(dates)
}

/** Get current streak count (consecutive days ending today or yesterday) */
export function getStreak(): number {
  const dates = getActivityDates()
  if (dates.size === 0) return 0

  const today = new Date()
  let current = new Date(today)

  // Allow streak to include today or start from yesterday
  if (!dates.has(toDateStr(current))) {
    current.setDate(current.getDate() - 1)
    if (!dates.has(toDateStr(current))) return 0
  }

  let streak = 0
  while (dates.has(toDateStr(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }

  return streak
}

/** Get activity status for each day of the current week (Sun-Sat) */
export function getWeekActivity(): { day: string; active: boolean; isToday: boolean }[] {
  const dates = getActivityDates()
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday

  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const result: { day: string; active: boolean; isToday: boolean }[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - dayOfWeek + i)
    result.push({
      day: days[i],
      active: dates.has(toDateStr(d)),
      isToday: i === dayOfWeek,
    })
  }

  return result
}
