// FE-UTIL-DAYDEL-001 to FE-UTIL-DAYDEL-012
import { describe, it, expect } from 'vitest'
import { buildAssignment, buildDay, buildDayNote, buildPlace, buildReservation } from '../../tests/helpers/factories'
import { contentOnDays, dayDeleteImpact, deleteDayBlockedReason, type DayContentData } from './dayDeleteImpact'
import type { Accommodation, Day } from '../types'

const stay = (overrides: Partial<Accommodation>): Accommodation =>
  ({ id: 1, trip_id: 1, place_id: null, start_day_id: 0, end_day_id: 0, ...overrides }) as Accommodation

const empty = (): DayContentData => ({ assignments: {}, dayNotes: {}, reservations: [], accommodations: [] })

/** Three dated days, 1 to 3 June, and optionally a spare day without a date at the end. */
function datedDays(spare = false): Day[] {
  const days = [
    buildDay({ id: 1, day_number: 1, date: '2026-06-01' }),
    buildDay({ id: 2, day_number: 2, date: '2026-06-02' }),
    buildDay({ id: 3, day_number: 3, date: '2026-06-03' }),
  ]
  return spare ? [...days, buildDay({ id: 4, day_number: 4, date: null })] : days
}

const range = { start_date: '2026-06-01', end_date: '2026-06-03' }

describe('contentOnDays', () => {
  it('FE-UTIL-DAYDEL-001: an empty day holds nothing', () => {
    const day = buildDay({ id: 7 })
    expect(contentOnDays([day], empty())).toEqual({ places: 0, notes: 0, texts: 0, bookings: 0, stays: [] })
  })

  it('FE-UTIL-DAYDEL-002: places count once each, and the stop a stay wrote is the stay, not a place', () => {
    const museum = buildPlace({ id: 50 })
    const cafe = buildPlace({ id: 51 })
    const hotel = buildPlace({ id: 52 })
    const data = {
      ...empty(),
      assignments: {
        '7': [
          buildAssignment({ day_id: 7, place: museum }),
          buildAssignment({ day_id: 7, place: museum }),
          buildAssignment({ day_id: 7, place: cafe }),
          buildAssignment({ day_id: 7, place: hotel, accommodation_id: 9 }),
        ],
        '8': [buildAssignment({ day_id: 8, place: buildPlace({ id: 53 }) })],
      },
    }
    expect(contentOnDays([buildDay({ id: 7 })], data).places).toBe(2)
  })

  it('FE-UTIL-DAYDEL-003: notes count one by one, a day title and a day description one each', () => {
    const data = { ...empty(), dayNotes: { '7': [buildDayNote({ day_id: 7 }), buildDayNote({ day_id: 7 })] } }
    expect(contentOnDays([buildDay({ id: 7, title: 'Harbour day', notes: 'Ferry at nine' })], data)).toMatchObject({ notes: 2, texts: 2 })
    expect(contentOnDays([buildDay({ id: 7, title: 'Harbour day', notes: null })], empty()).texts).toBe(1)
  })

  it('FE-UTIL-DAYDEL-004: bookings starting or ending on the day count, a cancelled stay\'s own booking does not', () => {
    const data = {
      ...empty(),
      accommodations: [stay({ id: 9, start_day_id: 7, end_day_id: 8 })],
      reservations: [
        buildReservation({ id: 1, day_id: 7 }),
        buildReservation({ id: 2, day_id: 6, end_day_id: 7 }),
        buildReservation({ id: 3, day_id: 8 }),
        buildReservation({ id: 4, day_id: 7, type: 'hotel', accommodation_id: '9' }),
      ],
    }
    expect(contentOnDays([buildDay({ id: 7 })], data).bookings).toBe(2)
  })

  it('FE-UTIL-DAYDEL-005: a stay checking in or out on the day goes, named by its place, with its booking', () => {
    const data: DayContentData = {
      ...empty(),
      places: [buildPlace({ id: 60, name: 'Pension Alma' })],
      accommodations: [
        stay({ id: 1, start_day_id: 7, end_day_id: 8, place_name: 'Harbour Hotel' }),
        stay({ id: 2, start_day_id: 5, end_day_id: 7, place_id: 60, reservation_title: 'Alma, two nights' }),
        stay({ id: 3, start_day_id: 5, end_day_id: 7 }),
        stay({ id: 4, start_day_id: 6, end_day_id: 8 }),
      ],
      reservations: [buildReservation({ id: 30, title: 'Harbour Hotel, 1 night', accommodation_id: 1 })],
    }
    expect(contentOnDays([buildDay({ id: 7 })], data).stays).toEqual([
      { id: 1, name: 'Harbour Hotel', booking: 'Harbour Hotel, 1 night' },
      { id: 2, name: 'Pension Alma', booking: 'Alma, two nights' },
      { id: 3, name: '', booking: null },
    ])
  })
})

describe('dayDeleteImpact', () => {
  it('FE-UTIL-DAYDEL-006: with a spare day left, the later dated days move one date and their bookings go along', () => {
    const days = datedDays(true)
    const data = {
      ...empty(),
      reservations: [
        buildReservation({ id: 1, day_id: 3, reservation_time: '2026-06-03T10:00' }),
        buildReservation({ id: 2, day_id: 1, end_day_id: 3, reservation_end_time: '2026-06-03T09:00' }),
        buildReservation({ id: 3, day_id: 3, reservation_time: null }),
        buildReservation({ id: 4, day_id: 1, reservation_time: '2026-06-01T08:00' }),
      ],
    }
    expect(dayDeleteImpact(days[1], days, data, range)).toMatchObject({ shiftedDays: 1, shiftedBookings: 2, newEndDate: null, isLastDay: false })
  })

  it('FE-UTIL-DAYDEL-007: with no spare day the last date goes, and a dated trip ends on the one before', () => {
    const days = datedDays()
    expect(dayDeleteImpact(days[0], days, empty(), range)).toMatchObject({ shiftedDays: 2, newEndDate: '2026-06-02' })
    // A trip without a range keeps it; only its days move.
    expect(dayDeleteImpact(days[0], days, empty(), { start_date: null, end_date: null }).newEndDate).toBeNull()
    // The last day of the list moves nothing.
    expect(dayDeleteImpact(days[2], days, empty(), range)).toMatchObject({ shiftedDays: 0, newEndDate: '2026-06-02' })
  })

  it('FE-UTIL-DAYDEL-008: a spare day moves no date, and the only day of a trip is the last one', () => {
    const days = datedDays(true)
    expect(dayDeleteImpact(days[3], days, empty(), range)).toMatchObject({ shiftedDays: 0, shiftedBookings: 0, newEndDate: null })
    const only = [buildDay({ id: 1, day_number: 1 })]
    expect(dayDeleteImpact(only[0], only, empty(), null).isLastDay).toBe(true)

    const t = (key: string) => key
    expect(deleteDayBlockedReason(1, true, t)).toBe('dayplan.deleteDayLast')
    expect(deleteDayBlockedReason(3, true, t)).toBe('dayplan.daysOffline')
    expect(deleteDayBlockedReason(3, false, t)).toBeNull()
  })
})

describe('contentOnDays over several days (the shrink warning)', () => {
  it('FE-UTIL-DAYDEL-009: counts across all the days at once', () => {
    const data = {
      ...empty(),
      assignments: {
        '7': [buildAssignment({ day_id: 7, place: buildPlace({ id: 50 }) })],
        '8': [buildAssignment({ day_id: 8, place: buildPlace({ id: 51 }) })],
      },
      dayNotes: { '7': [buildDayNote({ day_id: 7 })], '8': [buildDayNote({ day_id: 8 }), buildDayNote({ day_id: 8 })] },
      reservations: [buildReservation({ id: 1, day_id: 7 }), buildReservation({ id: 2, day_id: 8 }), buildReservation({ id: 3, day_id: 9 })],
    }
    const days = [buildDay({ id: 7, title: 'Harbour day' }), buildDay({ id: 8, notes: 'Ferry at nine' })]
    expect(contentOnDays(days, data)).toEqual({ places: 2, notes: 3, texts: 2, bookings: 2, stays: [] })
  })

  it('FE-UTIL-DAYDEL-010: a stay from one of the days to another counts once', () => {
    const data = { ...empty(), accommodations: [stay({ id: 9, start_day_id: 7, end_day_id: 8, place_name: 'Harbour Hotel' })] }
    expect(contentOnDays([buildDay({ id: 7 }), buildDay({ id: 8 })], data).stays).toEqual([
      { id: 9, name: 'Harbour Hotel', booking: null },
    ])
  })

  it('FE-UTIL-DAYDEL-011: the hotel booking of such a stay is the stay, not another booking', () => {
    const data = {
      ...empty(),
      accommodations: [stay({ id: 9, start_day_id: 7, end_day_id: 8 })],
      reservations: [buildReservation({ id: 4, day_id: 7, end_day_id: 8, type: 'hotel', title: 'Harbour, 1 night', accommodation_id: 9 })],
    }
    expect(contentOnDays([buildDay({ id: 7 }), buildDay({ id: 8 })], data)).toMatchObject({
      bookings: 0,
      stays: [{ id: 9, booking: 'Harbour, 1 night' }],
    })
  })

  it('FE-UTIL-DAYDEL-012: the same place on two days is one place, and the stops a stay wrote are none', () => {
    const museum = buildPlace({ id: 50 })
    const hotel = buildPlace({ id: 52 })
    const data = {
      ...empty(),
      assignments: {
        '7': [buildAssignment({ day_id: 7, place: museum }), buildAssignment({ day_id: 7, place: hotel, accommodation_id: 9 })],
        '8': [buildAssignment({ day_id: 8, place: museum }), buildAssignment({ day_id: 8, place: hotel, accommodation_id: 9 })],
      },
    }
    expect(contentOnDays([buildDay({ id: 7 }), buildDay({ id: 8 })], data).places).toBe(1)
  })
})
