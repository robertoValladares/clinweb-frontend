import type { DateRange, DateRangeKey } from '../types/database'

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function resolveDateRange(key: DateRangeKey, now = new Date()): DateRange {
  const to = now
  switch (key) {
    case 'today':
      return { key, from: startOfLocalDay(now), to, label: 'Hoy' }
    case '7d': {
      const from = startOfLocalDay(now)
      from.setDate(from.getDate() - 6)
      return { key, from, to, label: 'Últimos 7 días' }
    }
    case '30d': {
      const from = startOfLocalDay(now)
      from.setDate(from.getDate() - 29)
      return { key, from, to, label: 'Últimos 30 días' }
    }
    case 'month':
      return { key, from: startOfMonth(now), to, label: 'Este mes' }
    case 'all':
      return { key, from: null, to, label: 'Todo' }
  }
}

export const RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'all', label: 'Todo' },
]