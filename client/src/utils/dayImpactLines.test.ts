// FE-UTIL-DAYLINES-001 to FE-UTIL-DAYLINES-004
import { describe, it, expect } from 'vitest'
import { BedDouble, CalendarCheck } from 'lucide-react'
import { deleteDayLines, impactLines } from './dayImpactLines'
import type { DayDeleteImpact } from './dayDeleteImpact'

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key

const nothing: DayDeleteImpact = {
  places: 0, notes: 0, texts: 0, bookings: 0, stays: [],
  shiftedDays: 0, shiftedBookings: 0, newEndDate: null, isLastDay: false,
}

describe('impactLines', () => {
  it('FE-UTIL-DAYLINES-001: stays come first in the danger tone, then every kind that has something in it', () => {
    const lines = impactLines({
      places: 3, notes: 2, texts: 1, bookings: 4,
      stays: [{ id: 9, name: 'Harbour Hotel', booking: 'HH 1 night' }, { id: 10, name: 'Pension Alma', booking: null }],
    }, t, 'deleteDay')

    expect(lines.map(l => [l.key, l.tone, l.text, l.hint])).toEqual([
      ['stay-9', 'danger', 'dayplan.impactStay(name=Harbour Hotel)', 'dayplan.deleteDayStayBookedHint(booking=HH 1 night)'],
      ['stay-10', 'danger', 'dayplan.impactStay(name=Pension Alma)', 'dayplan.deleteDayStayHint'],
      ['places', 'neutral', 'dayplan.impactPlaces(count=3)', 'dayplan.impactPlacesHint'],
      ['notes', 'neutral', 'dayplan.impactNotes(count=2)', 'dayplan.impactDeletedHint'],
      ['texts', 'neutral', 'dayplan.impactTexts(count=1)', 'dayplan.impactDeletedHint'],
      ['bookings', 'neutral', 'dayplan.impactBookings(count=4)', 'dayplan.deleteDayBookingsHint'],
    ])
    expect(lines[0].icon).toBe(BedDouble)
  })

  it('FE-UTIL-DAYLINES-002: kinds with nothing in them are left out', () => {
    expect(impactLines({ ...nothing, notes: 1 }, t, 'deleteDay').map(l => l.key)).toEqual(['notes'])
    expect(impactLines(nothing, t, 'deleteDay')).toEqual([])
  })
})

describe('deleteDayLines', () => {
  const formatDate = (iso: string) => `<${iso}>`

  it('FE-UTIL-DAYLINES-003: moved dates follow the content, with the bookings that move along and the new end', () => {
    const lines = deleteDayLines({ ...nothing, places: 1, shiftedDays: 2, shiftedBookings: 3, newEndDate: '2026-06-02' }, t, formatDate)
    expect(lines.map(l => [l.key, l.tone, l.text, l.hint])).toEqual([
      ['places', 'neutral', 'dayplan.impactPlaces(count=1)', 'dayplan.impactPlacesHint'],
      ['shift', 'warning', 'dayplan.deleteDayShift(count=2)', 'dayplan.deleteDayShiftBookingsHint(count=3)'],
      ['shrink', 'warning', 'dayplan.deleteDayShrink(date=<2026-06-02>)', 'dayplan.deleteDayShrinkHint'],
    ])
    expect(deleteDayLines({ ...nothing, shiftedDays: 1 }, t, formatDate)[0].hint).toBe('dayplan.deleteDayShiftHint')
  })

  it('FE-UTIL-DAYLINES-004: a day with nothing on it and no dates to move gets one quiet row', () => {
    const lines = deleteDayLines(nothing, t, formatDate)
    expect(lines).toEqual([{ key: 'empty', icon: CalendarCheck, tone: 'muted', text: 'dayplan.deleteDayEmpty' }])
  })
})
