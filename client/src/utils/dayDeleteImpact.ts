import type { Accommodation, AssignmentsMap, Day, DayNotesMap, Place, Reservation, Trip } from '../types'

/** What the trip holds on its days, as the store and the planner have it. */
export interface DayContentData {
  assignments: AssignmentsMap
  dayNotes: DayNotesMap
  reservations: Reservation[]
  accommodations: Accommodation[]
  places?: Place[]
}

/** A stay that goes with the days: checked in or out on one of them. */
export interface StayImpact {
  id: number
  name: string
  /** Title of the booking that goes with it, or null when none is linked. */
  booking: string | null
}

/** What sits on a set of days and would go with them. */
export interface DayContent {
  /** Distinct places planned there. The places themselves stay on the trip. */
  places: number
  notes: number
  /** Day titles and day descriptions. */
  texts: number
  /** Bookings on the days, the ones a cancelled stay takes along left out. */
  bookings: number
  stays: StayImpact[]
}

/** Deleting one day: its content, and what the dates of the other days do. */
export interface DayDeleteImpact extends DayContent {
  /** Later dated days that take another date. */
  shiftedDays: number
  /** Bookings on those days whose date is re-stamped with them. */
  shiftedBookings: number
  /** The trip's new last date when the delete takes the last date along. */
  newEndDate: string | null
  isLastDay: boolean
}

const byNumber = (a: Day, b: Day): number => (a.day_number ?? 0) - (b.day_number ?? 0)

/** A reservation's link to a stay, which the wire carries as a number or a string. */
const stayOf = (r: Reservation): number | null => (r.accommodation_id == null ? null : Number(r.accommodation_id))

/**
 * Count what sits on the given days, the way the server treats it when they go.
 *
 * A stop a stay wrote is the stay, not a place of its own, so it is not counted
 * as one; a stay touching two of the days counts once, and the booking that came
 * with it is part of the stay rather than one of the bookings. Shared by the day
 * delete question and the warning before a trip is shortened.
 */
export function contentOnDays(days: Pick<Day, 'id' | 'title' | 'notes'>[], data: DayContentData): DayContent {
  const ids = new Set(days.map(d => d.id))
  const stays = data.accommodations.filter(stay => ids.has(stay.start_day_id) || ids.has(stay.end_day_id))
  const stayIds = new Set(stays.map(stay => stay.id))

  const placeIds = new Set<number>()
  let notes = 0
  let texts = 0
  for (const day of days) {
    for (const assignment of data.assignments[String(day.id)] ?? []) {
      if (assignment.accommodation_id == null) placeIds.add(assignment.place.id)
    }
    notes += (data.dayNotes[String(day.id)] ?? []).length
    if (day.title) texts += 1
    if (day.notes) texts += 1
  }

  const onDays = (r: Reservation) => (r.day_id != null && ids.has(r.day_id)) || (r.end_day_id != null && ids.has(r.end_day_id))
  const bookings = data.reservations.filter(r => onDays(r) && !stayIds.has(stayOf(r) ?? -1)).length

  return {
    places: placeIds.size,
    notes,
    texts,
    bookings,
    stays: stays.map(stay => {
      const booking = data.reservations.find(r => stayOf(r) === stay.id)?.title ?? stay.reservation_title ?? null
      const name = stay.place_name ?? data.places?.find(p => p.id === stay.place_id)?.name ?? booking ?? ''
      return { id: stay.id, name, booking }
    }),
  }
}

/**
 * What deleting one day does, as the server will do it (DayRemovalService): the
 * dates stay on their positions, so every later dated day takes the date one slot
 * earlier and the bookings on it are re-stamped along. When no day without a date
 * is left to take the last date, the last date goes and a dated trip ends a day
 * earlier.
 */
export function dayDeleteImpact(
  day: Day,
  days: Day[],
  data: DayContentData,
  trip: Pick<Trip, 'start_date' | 'end_date'> | null,
): DayDeleteImpact {
  const content = contentOnDays([day], data)
  const ordered = [...days].sort(byNumber)
  const remaining = ordered.filter(d => d.id !== day.id)
  const dates = ordered.map(d => d.date).filter((d): d is string => !!d).sort()

  const moved = new Set<number>()
  remaining.forEach((d, i) => {
    const next = dates[i]
    if (d.date && next && next !== d.date) moved.add(d.id)
  })
  const cancelled = new Set(content.stays.map(stay => stay.id))
  const shiftedBookings = data.reservations.filter(r => {
    if (cancelled.has(stayOf(r) ?? -1)) return false
    const start = r.day_id != null && moved.has(r.day_id) && !!r.reservation_time
    const end = r.end_day_id != null && moved.has(r.end_day_id) && !!r.reservation_end_time
    return start || end
  }).length

  const dropsDate = remaining.length < dates.length
  const newEndDate = dropsDate && trip?.start_date && trip.end_date ? (dates[remaining.length - 1] ?? null) : null

  return { ...content, shiftedDays: moved.size, shiftedBookings, newEndDate, isLastDay: days.length <= 1 }
}

/**
 * Why a day cannot be deleted right now, or null when it can. A trip keeps at
 * least one day, and the delete runs on the server only: the cascade behind it
 * (stays cancelled, bookings let go of, dates moved) is not something a queued
 * offline write could replay faithfully.
 */
export function deleteDayBlockedReason(dayCount: number, offline: boolean, t: (key: string) => string): string | null {
  if (dayCount <= 1) return t('dayplan.deleteDayLast')
  if (offline) return t('dayplan.daysOffline')
  return null
}
