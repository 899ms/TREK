import { MAX_TRIP_DAYS, tripSpanDays } from './trip.schema';

/**
 * Pure rules for the day rows of a dated trip, for both sides of the wire. The
 * server writes by them and the planner shows by them, so a date the planner
 * promises before a write is the date the write stores.
 */

const MS_PER_DAY = 86_400_000;

/**
 * Add `n` calendar days to a YYYY-MM-DD date, entirely in UTC.
 *
 * Never through a local-time Date: `new Date('2026-06-07T00:00:00')` is local
 * midnight, and the round trip through toISOString() lands on the day before
 * wherever the clock sits east of Greenwich.
 */
export function addIsoDays(date: string, n: number): string {
  const [y = NaN, m = NaN, d = NaN] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d) + n * MS_PER_DAY);
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** The day after the later of `endDate` and the latest date a day carries. ISO dates compare as strings. */
function dayAfterLatest(endDate: string, dayDates: readonly (string | null | undefined)[]): string {
  const latest = dayDates.reduce<string>((last, date) => (date && date > last ? date : last), endDate);
  return addIsoDays(latest, 1);
}

/**
 * The date a day added "with a date" gets: the day after the trip's end date,
 * or after the latest date a day carries when one lies further out. Null for a
 * trip without an end date.
 *
 * The two agree on any trip the planner wrote. Reading the days as well keeps
 * the new day off a date another day already has, whatever state the range is in.
 */
export function nextTripDate(
  endDate: string | null | undefined,
  dayDates: readonly (string | null | undefined)[],
): string | null {
  return endDate ? dayAfterLatest(endDate, dayDates) : null;
}

/** A day added with a date: the date it gets, and whether the trip may still grow to it. */
export interface DatedAppendPlan {
  date: string;
  fits: boolean;
}

/**
 * What adding the next dated day would do to a trip. Null for a trip without
 * dates, which only takes days without one. `fits` is false when the longer
 * range would pass MAX_TRIP_DAYS. The server refuses by this and the planner
 * greys its button by it, so the two cannot disagree about the limit.
 */
export function planDatedAppend(
  trip: { start_date?: string | null; end_date?: string | null },
  dayDates: readonly (string | null | undefined)[],
): DatedAppendPlan | null {
  if (!trip.start_date || !trip.end_date) return null;
  const date = dayAfterLatest(trip.end_date, dayDates);
  return { date, fits: tripSpanDays(trip.start_date, date) <= MAX_TRIP_DAYS };
}
