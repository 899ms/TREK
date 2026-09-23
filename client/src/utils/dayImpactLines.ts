import { BedDouble, CalendarCheck, CalendarClock, CalendarMinus, MapPin, StickyNote, Ticket, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DayContent, DayDeleteImpact } from './dayDeleteImpact'

type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * How loud a line is. `danger` is money: a stay cancelled with its booking and
 * expense. `warning` is dates that move. `muted` is the reassurance that nothing
 * is lost at all.
 */
export type ImpactTone = 'neutral' | 'muted' | 'warning' | 'danger'

/** One row of a warning list, ready for either shell to render. */
export interface ImpactLine {
  key: string
  icon: LucideIcon
  text: string
  hint?: string
  tone: ImpactTone
}

/**
 * The question the list answers. Deleting a day cancels a stay cleanly and lets
 * go of its bookings; other ways of losing days treat both differently, so the
 * hints are looked up per variant while the rows themselves stay the same.
 */
export type ImpactVariant = 'deleteDay'

const HINTS: Record<ImpactVariant, { bookings: string; stay: string; stayBooked: string }> = {
  deleteDay: {
    bookings: 'dayplan.deleteDayBookingsHint',
    stay: 'dayplan.deleteDayStayHint',
    stayBooked: 'dayplan.deleteDayStayBookedHint',
  },
}

/**
 * The rows for what sits on the days that go: stays first, because they cost
 * money, then places, notes, day texts and bookings. Kinds with nothing in them
 * are left out.
 */
export function impactLines(content: DayContent, t: Translate, variant: ImpactVariant): ImpactLine[] {
  const hints = HINTS[variant]
  const lines: ImpactLine[] = content.stays.map(stay => ({
    key: `stay-${stay.id}`,
    icon: BedDouble,
    tone: 'danger',
    text: t('dayplan.impactStay', { name: stay.name }),
    hint: stay.booking ? t(hints.stayBooked, { booking: stay.booking }) : t(hints.stay),
  }))
  if (content.places > 0) {
    lines.push({ key: 'places', icon: MapPin, tone: 'neutral', text: t('dayplan.impactPlaces', { count: content.places }), hint: t('dayplan.impactPlacesHint') })
  }
  if (content.notes > 0) {
    lines.push({ key: 'notes', icon: StickyNote, tone: 'neutral', text: t('dayplan.impactNotes', { count: content.notes }), hint: t('dayplan.impactDeletedHint') })
  }
  if (content.texts > 0) {
    lines.push({ key: 'texts', icon: Type, tone: 'neutral', text: t('dayplan.impactTexts', { count: content.texts }), hint: t('dayplan.impactDeletedHint') })
  }
  if (content.bookings > 0) {
    lines.push({ key: 'bookings', icon: Ticket, tone: 'neutral', text: t('dayplan.impactBookings', { count: content.bookings }), hint: t(hints.bookings) })
  }
  return lines
}

/**
 * The full list for the delete question: the content rows, then what happens to
 * the dates, and a single quiet row for a day with nothing on it.
 */
export function deleteDayLines(impact: DayDeleteImpact, t: Translate, formatDate: (iso: string) => string): ImpactLine[] {
  const lines = impactLines(impact, t, 'deleteDay')
  if (impact.shiftedDays > 0) {
    lines.push({
      key: 'shift',
      icon: CalendarClock,
      tone: 'warning',
      text: t('dayplan.deleteDayShift', { count: impact.shiftedDays }),
      hint: impact.shiftedBookings > 0
        ? t('dayplan.deleteDayShiftBookingsHint', { count: impact.shiftedBookings })
        : t('dayplan.deleteDayShiftHint'),
    })
  }
  if (impact.newEndDate) {
    lines.push({
      key: 'shrink',
      icon: CalendarMinus,
      tone: 'warning',
      text: t('dayplan.deleteDayShrink', { date: formatDate(impact.newEndDate) }),
      hint: t('dayplan.deleteDayShrinkHint'),
    })
  }
  if (lines.length === 0) {
    lines.push({ key: 'empty', icon: CalendarCheck, tone: 'muted', text: t('dayplan.deleteDayEmpty') })
  }
  return lines
}
