import type { Day } from '../types'

type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * How a day is named wherever days are listed as a whole: its title, else its
 * date as a short weekday and day of the month, else "Day n" by its position.
 *
 * The reorder dialog, the phone's day sheet and the delete question all name a
 * day, and they have to name it the same way, or the question asks about a day
 * the list beside it calls something else. The date is read as a local calendar
 * date, and a value that does not parse falls through to the position.
 */
export function dayLabel(day: Pick<Day, 'title' | 'date'>, index: number, t: Translate, locale: string): string {
  if (day.title) return day.title
  if (day.date) {
    const date = new Date(`${day.date.slice(0, 10)}T00:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    }
  }
  return t('dayplan.dayN', { n: index + 1 })
}
