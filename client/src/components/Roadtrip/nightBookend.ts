import { BedDouble, type LucideIcon } from 'lucide-react'
import { formatClockTime } from '../../utils/formatters'
import type { TranslationFn } from '../../types'
import type { BookendReading } from './roadtripRowModel'

/**
 * How a booked night at the edge of a day reads on the rail and in the phone chain, and
 * what a tap on it opens.
 *
 * One module for both shells, the way `carrierRide` is for a ride: the two would otherwise
 * carry the same sentence and the same decision each, and the duplication budget does not
 * stretch to that. What the row IS comes from the row model (`bookendReading`); this only
 * says it.
 */

/** The bed the day plan's stay chips wear, so the hotel looks like itself here too. */
export const BOOKEND_ICON: LucideIcon = BedDouble

/** "Check-out · the stay", "From …", "Back to …" or "Check-in · …". */
export function bookendTitle(reading: BookendReading, t: TranslationFn): string {
  return t(`roadtrip.bookend.${reading.variant}`, { name: reading.name })
}

/**
 * The line under it: on a check-out morning the latest the room is handed back, in the
 * reader's own clock format. A label, never the time the drive leaves at (#2357).
 */
export function bookendMeta(reading: BookendReading, t: TranslationFn, is12h: boolean): string | null {
  return reading.until ? t('roadtrip.stay.until', { time: formatClockTime(reading.until, is12h) }) : null
}

/**
 * The booking a tap on the row opens, or null when it opens the stay's place instead.
 *
 * The booking behind the night when there is one and this reader may open it: a hotel
 * booking has only its editor, the split `bookingOpens` makes for a chip. Otherwise the
 * place, which anybody may look at.
 */
export function bookendBooking(reading: BookendReading, canEditBookings: boolean): number | null {
  return canEditBookings ? reading.reservationId : null
}
