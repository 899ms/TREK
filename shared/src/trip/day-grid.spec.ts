import { addIsoDays, nextTripDate, planDatedAppend } from './day-grid';
import { MAX_TRIP_DAYS } from './trip.schema';

import { describe, expect, it } from 'vitest';

describe('addIsoDays', () => {
  it('steps over the ends of months and years, and back', () => {
    expect(addIsoDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addIsoDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addIsoDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addIsoDays('2026-06-07', 0)).toBe('2026-06-07');
  });

  it('knows the leap day, and a year without one', () => {
    expect(addIsoDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addIsoDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addIsoDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('counts calendar days across a daylight saving change', () => {
    // Europe moves its clocks on these Sundays; a local-time step would slip a day.
    expect(addIsoDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addIsoDays('2026-10-24', 2)).toBe('2026-10-26');
  });
});

describe('nextTripDate', () => {
  it('is the day after the end date when no day lies beyond it', () => {
    expect(nextTripDate('2026-10-12', ['2026-10-10', '2026-10-11', '2026-10-12', null])).toBe('2026-10-13');
    expect(nextTripDate('2026-10-12', [])).toBe('2026-10-13');
  });

  it('is the day after the latest day date when that lies past the end date', () => {
    expect(nextTripDate('2026-10-12', ['2026-10-12', '2026-10-15', undefined, '2026-10-14'])).toBe('2026-10-16');
  });

  it('is null for a trip without an end date', () => {
    expect(nextTripDate(null, ['2026-10-12'])).toBeNull();
    expect(nextTripDate(undefined, [])).toBeNull();
    expect(nextTripDate('', [])).toBeNull();
  });
});

describe('planDatedAppend', () => {
  it('gives the next date and lets the trip grow to it', () => {
    expect(planDatedAppend({ start_date: '2026-10-10', end_date: '2026-10-12' }, ['2026-10-12'])).toEqual({
      date: '2026-10-13',
      fits: true,
    });
  });

  it('refuses nothing up to the day limit and the day past it', () => {
    const start = '2026-01-01';
    const lastAllowed = addIsoDays(start, MAX_TRIP_DAYS - 1);
    expect(planDatedAppend({ start_date: start, end_date: addIsoDays(lastAllowed, -1) }, [])).toEqual({
      date: lastAllowed,
      fits: true,
    });
    expect(planDatedAppend({ start_date: start, end_date: lastAllowed }, [])).toEqual({
      date: addIsoDays(lastAllowed, 1),
      fits: false,
    });
  });

  it('has nothing to plan for a trip missing either date', () => {
    expect(planDatedAppend({ start_date: null, end_date: '2026-10-12' }, [])).toBeNull();
    expect(planDatedAppend({ start_date: '2026-10-10', end_date: null }, [])).toBeNull();
    expect(planDatedAppend({}, ['2026-10-10'])).toBeNull();
  });
});
