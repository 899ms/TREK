import { describe, expect, it } from 'vitest'
import { BedDouble } from 'lucide-react'
import { BOOKEND_ICON, bookendBooking, bookendMeta, bookendTitle, staysAtTheirPlaces } from './nightBookend'
import type { BookendReading } from './roadtripRowModel'

// FE-BOOKEND-001 to FE-BOOKEND-006

const reading = (over: Partial<BookendReading> = {}): BookendReading => ({
  phase: 'morning',
  variant: 'from',
  name: 'Hotel Alpenblick',
  until: null,
  reservationId: 41,
  accommodationId: 5,
  placeId: 900,
  ...over,
})

/** A translator that shows the key and what went into it, so a test reads which sentence was asked for. */
const t = (key: string, params?: Record<string, string | number | null>) =>
  params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key

describe('a booked night as the rail and the phone say it', () => {
  it('FE-BOOKEND-001: each of the four readings is its own sentence, with the stay named in it', () => {
    expect(bookendTitle(reading({ variant: 'checkOut' }), t)).toBe('roadtrip.bookend.checkOut(name=Hotel Alpenblick)')
    expect(bookendTitle(reading({ variant: 'from' }), t)).toBe('roadtrip.bookend.from(name=Hotel Alpenblick)')
    expect(bookendTitle(reading({ phase: 'evening', variant: 'back' }), t)).toBe('roadtrip.bookend.back(name=Hotel Alpenblick)')
    expect(bookendTitle(reading({ phase: 'evening', variant: 'checkIn' }), t)).toBe('roadtrip.bookend.checkIn(name=Hotel Alpenblick)')
  })

  it('FE-BOOKEND-002: the check-out hour is a label in the reader\'s clock', () => {
    expect(bookendMeta(reading({ variant: 'checkOut', until: '10:00' }), t, false)).toBe('roadtrip.stay.until(time=10:00)')
    expect(bookendMeta(reading({ variant: 'checkOut', until: '14:30' }), t, true)).toBe('roadtrip.stay.until(time=2:30 PM)')
  })

  it('FE-BOOKEND-003: nothing under the line when the morning hands no room back', () => {
    expect(bookendMeta(reading(), t, false)).toBeNull()
    expect(bookendMeta(reading({ phase: 'evening', variant: 'back' }), t, false)).toBeNull()
  })

  it('FE-BOOKEND-004: a tap opens the booking behind the night for somebody who may edit bookings', () => {
    expect(bookendBooking(reading(), true)).toBe(41)
    // The editor is the only view a hotel booking has, so anybody else gets the place.
    expect(bookendBooking(reading(), false)).toBeNull()
    // A stay entered without a booking has none to open.
    expect(bookendBooking(reading({ reservationId: null }), true)).toBeNull()
  })

  it('FE-BOOKEND-005: the hotel wears the bed the stay chips wear', () => {
    expect(BOOKEND_ICON).toBe(BedDouble)
  })
})

describe('the hotel a booked night stands for', () => {
  it('FE-BOOKEND-006: is read off the trip place as it is now, and the stay row stands in only where there is none', () => {
    const moved = { id: 1, place_id: 10, place_name: 'Old name', place_lat: 47.2, place_lng: 11.4 }
    const unknown = { id: 2, place_id: 20, place_name: 'Elsewhere', place_lat: 48.1, place_lng: 11.6 }
    const placeless = { id: 3, place_id: null, place_name: null, place_lat: null, place_lng: null }
    const places = [
      { id: 10, name: 'Hotel Alpenblick', lat: 47.3, lng: 11.5 },
      { id: 30, name: 'Unrelated', lat: 1, lng: 2 },
    ]

    const read = staysAtTheirPlaces([moved, unknown, placeless], places)
    expect(read[0]).toEqual({ id: 1, place_id: 10, place_name: 'Hotel Alpenblick', place_lat: 47.3, place_lng: 11.5 })
    expect(read[1]).toBe(unknown)
    expect(read[2]).toBe(placeless)

    // A place that lost its pin takes the bookend with it, as the server's join does.
    expect(staysAtTheirPlaces([moved], [{ id: 10, name: 'Hotel Alpenblick', lat: null, lng: null }])[0])
      .toMatchObject({ place_lat: null, place_lng: null })

    // Nothing to change hands the list back as it came, so nothing downstream recomputes.
    const current = [{ ...moved, place_name: 'Hotel Alpenblick', place_lat: 47.3, place_lng: 11.5 }]
    expect(staysAtTheirPlaces(current, places)).toBe(current)
    expect(staysAtTheirPlaces(current, [])).toBe(current)
  })
})
