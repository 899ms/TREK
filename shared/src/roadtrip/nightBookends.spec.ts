/**
 * ROADTRIP-BOOKENDS-001..027: a booked night stands at both ends of the days around it.
 *
 * Pinned here: which hotel a day wakes up in and which it sleeps in, where the two are
 * seated and where they are not (the hotel already there, a landing, a departure, a hire
 * car's desk, a day with nothing of its own), what a bookend carries and what it never
 * does (a clock), that the choice does not depend on the order the stays come in, and
 * that a night spent at one hotel is a leg going nowhere.
 */
import { terminalAssignmentId } from './carriers';
import {
  bookendAssignmentId,
  bookendStaysOf,
  hotelBookendsOn,
  isStationaryJoin,
  seatNightBookends,
  withStationaryJoins,
  type BookendStay,
} from './nightBookends';
import type { CarrierTerminal, PlanDay, RoadtripStop, RoutedLeg } from './planning-types';
import { standsAsDay } from './roadtripModel';

import { describe, expect, it } from 'vitest';

const days = [1, 2, 3, 4, 5, 6].map((n) => ({ id: n * 10, day_number: n }));
const [D1, D2, D3, D4] = [10, 20, 30, 40];

const GETAWAY: [number, number] = [-33.5, 150.4];
const WALLINGA: [number, number] = [-34.1, 150.9];
const HOTEL: [number, number] = [45.1, 7.6];

const stay = (
  id: number,
  start: number,
  end: number,
  at: [number, number] | null,
  over: Partial<BookendStay> = {},
): BookendStay => ({
  id,
  place_id: 500 + id,
  start_day_id: start,
  end_day_id: end,
  place_lat: at ? at[0] : null,
  place_lng: at ? at[1] : null,
  place_name: `Stay ${id}`,
  check_out: '10:00',
  reservation_id: 900 + id,
  ...over,
});

let nextId = 1;
const visit = (dayId: number, ownerIndex: number, over: Partial<RoadtripStop> = {}): RoadtripStop => {
  const id = nextId++;
  return {
    assignmentId: id,
    ownerDayId: dayId,
    ownerIndex,
    placeId: 100 + id,
    name: `Place ${id}`,
    lat: 40 + id * 0.01,
    lng: 5 + id * 0.01,
    time: null,
    dwellMinutes: 30,
    legMode: null,
    incomingLegMode: null,
    stopType: null,
    ...over,
  };
};
/** The stay's own stop on its check-in day, where the booking put it (#2354). */
const stayStop = (dayId: number, ownerIndex: number, at: [number, number], over: Partial<RoadtripStop> = {}) =>
  visit(dayId, ownerIndex, { lat: at[0], lng: at[1], night: true, stopType: 'hotel', ...over });
const terminal = (dayId: number, ownerIndex: number, role: CarrierTerminal['role']): RoadtripStop =>
  visit(dayId, ownerIndex, {
    carrier: {
      reservationId: 77,
      type: role === 'pickup' || role === 'return' ? 'car' : 'flight',
      role,
      title: 'Ride',
      code: null,
      at: null,
    },
    assignmentId: terminalAssignmentId(77, role),
    placeId: -77,
  });

const planDay = (dayId: number, stops: RoadtripStop[]): PlanDay => ({
  dayId,
  dayNumber: dayId / 10,
  date: null,
  title: null,
  stops,
});
const shape = (day: PlanDay | undefined): string[] =>
  (day?.stops ?? []).map((s) =>
    s.bookend ? `${s.bookend.phase}:${s.bookend.accommodationId}` : s.carrier ? s.carrier.role : s.name,
  );

describe('a check-in with places, then a transfer day with nothing of its own', () => {
  const getaway = stay(1, D1, D2, GETAWAY, { check_out: '10:00' });
  const wallinga = stay(2, D2, D3, WALLINGA);
  const checkIn = stayStop(D1, 0, GETAWAY, { name: 'Getaway', checkInTime: '14:00' });
  const lookout = visit(D1, 1, { name: 'Lookout' });
  const falls = visit(D1, 2, { name: 'Falls' });
  const wallingaStop = stayStop(D2, 0, WALLINGA, { name: 'Wallinga', checkInTime: '15:00' });
  const plan = [planDay(D1, [checkIn, lookout, falls]), planDay(D2, [wallingaStop]), planDay(D3, [])];
  const seated = seatNightBookends(plan, days, [getaway, wallinga]);

  it('ROADTRIP-BOOKENDS-001: the check-in day ends back at the stay, and nothing wakes up there', () => {
    expect(shape(seated[0])).toEqual(['Getaway', 'Lookout', 'Falls', 'evening:1']);
    const back = seated[0]!.stops[3]!;
    expect(back.bookend).toEqual({
      phase: 'evening',
      accommodationId: 1,
      reservationId: 901,
      checkingOut: false,
      checkingIn: true,
      checkOut: null,
    });
    expect(back).toMatchObject({
      placeId: 501,
      name: 'Stay 1',
      lat: GETAWAY[0],
      lng: GETAWAY[1],
      ownerDayId: D1,
      ownerIndex: 3,
      stopType: 'hotel',
      assignmentId: bookendAssignmentId(D1, 'evening'),
    });
  });

  it('ROADTRIP-BOOKENDS-002: the transfer day checks out of one stay and drives to the stop of the next', () => {
    expect(shape(seated[1])).toEqual(['morning:1', 'Wallinga']);
    const out = seated[1]!.stops[0]!;
    expect(out.bookend).toMatchObject({ phase: 'morning', checkingOut: true, checkingIn: false, checkOut: '10:00' });
    expect(out.ownerIndex).toBe(0);
    // Tonight's stay is already the day's last stop, so no evening is seated behind it.
    expect(seated[1]!.stops).toHaveLength(2);
  });

  it('ROADTRIP-BOOKENDS-003: a day that is only a check-out gets no drive, and keeps its object', () => {
    expect(seated[2]!.stops).toEqual([]);
    expect(seated[2]).toBe(plan[2]);
  });
});

describe('three nights in one hotel, places on the days between', () => {
  const hotel = stay(5, D1, D4, HOTEL);
  const h = stayStop(D1, 0, HOTEL, { name: 'H', checkInTime: '15:00' });
  const plan = [
    planDay(D1, [h, visit(D1, 1, { name: 'P1' }), visit(D1, 2, { name: 'P2' })]),
    planDay(D2, [visit(D2, 0, { name: 'P3' }), visit(D2, 1, { name: 'P4' })]),
    planDay(D3, [visit(D3, 0, { name: 'P5' }), visit(D3, 1, { name: 'P6' })]),
    planDay(D4, []),
  ];
  const seated = seatNightBookends(plan, days, [hotel]);

  it('ROADTRIP-BOOKENDS-004: every day between the nights starts and ends at the hotel', () => {
    expect(shape(seated[0])).toEqual(['H', 'P1', 'P2', 'evening:5']);
    expect(shape(seated[1])).toEqual(['morning:5', 'P3', 'P4', 'evening:5']);
    expect(shape(seated[2])).toEqual(['morning:5', 'P5', 'P6', 'evening:5']);
    expect(seated[1]!.stops[0]!.bookend).toMatchObject({ checkingOut: false, checkingIn: false, checkOut: null });
    // The evening keeps the index the next stored stop would have, the terminals' rule.
    expect(seated[1]!.stops[3]!.ownerIndex).toBe(2);
  });

  it('ROADTRIP-BOOKENDS-005: the empty check-out day is not driven', () => {
    expect(seated[3]).toBe(plan[3]);
  });

  it('ROADTRIP-BOOKENDS-006: a day in the hotel with nothing planned stays quiet, one with a single place becomes a loop', () => {
    const quiet = seatNightBookends([planDay(D2, [])], days, [hotel]);
    expect(quiet[0]!.stops).toEqual([]);
    const one = seatNightBookends([planDay(D2, [visit(D2, 0, { name: 'P' })])], days, [hotel]);
    expect(shape(one[0])).toEqual(['morning:5', 'P', 'evening:5']);
  });

  it('ROADTRIP-BOOKENDS-007: the hotel already first or last on the day is not seated again on that side', () => {
    const first = seatNightBookends(
      [planDay(D2, [stayStop(D2, 0, HOTEL, { name: 'H again' }), visit(D2, 1, { name: 'P' })])],
      days,
      [hotel],
    );
    expect(shape(first[0])).toEqual(['H again', 'P', 'evening:5']);
    const last = seatNightBookends(
      [planDay(D2, [visit(D2, 0, { name: 'P' }), stayStop(D2, 1, HOTEL, { name: 'H again' })])],
      days,
      [hotel],
    );
    expect(shape(last[0])).toEqual(['morning:5', 'P', 'H again']);
  });
});

describe('a transfer day', () => {
  const a = stay(1, D1, D2, GETAWAY);
  const b = stay(2, D2, D3, WALLINGA);

  it('ROADTRIP-BOOKENDS-008: with nothing stored, the day drives from one stay to the other', () => {
    const [day] = seatNightBookends([planDay(D2, [])], days, [a, b]);
    expect(shape(day)).toEqual(['morning:1', 'evening:2']);
    expect(day!.stops[0]!.bookend).toMatchObject({ checkingOut: true });
    expect(day!.stops[1]!.bookend).toMatchObject({ checkingIn: true, checkOut: null });
    expect(day!.stops.map((s) => s.ownerIndex)).toEqual([0, 0]);
  });

  it('ROADTRIP-BOOKENDS-009: with places, a place with its own earlier hour stays where it is', () => {
    const p0 = visit(D2, 0, { name: 'P0', time: '11:00' });
    const checkIn = stayStop(D2, 1, WALLINGA, { name: 'B', checkInTime: '15:00' });
    const p1 = visit(D2, 2, { name: 'P1' });
    const [day] = seatNightBookends([planDay(D2, [p0, checkIn, p1])], days, [a, b]);
    expect(shape(day)).toEqual(['morning:1', 'P0', 'B', 'P1', 'evening:2']);
  });
});

describe('a day that starts or ends on a ride or at a hire car desk', () => {
  const hotel = stay(5, D1, D4, HOTEL);

  // Landing, or at the desk the car is picked up at: the traveller was not at the hotel.
  it.each([{ role: 'arrival' }, { role: 'pickup' }] as const)(
    'ROADTRIP-BOOKENDS-010: no morning when $role opens the day',
    ({ role }) => {
      const [day] = seatNightBookends([planDay(D2, [terminal(D2, 0, role), visit(D2, 0, { name: 'P' })])], days, [
        hotel,
      ]);
      expect(shape(day)).toEqual([role, 'P', 'evening:5']);
    },
  );

  // At the gate, or where the car goes back: the traveller is not driving to the hotel.
  it.each([{ role: 'departure' }, { role: 'return' }] as const)(
    'ROADTRIP-BOOKENDS-011: no evening when $role closes the day',
    ({ role }) => {
      const [day] = seatNightBookends([planDay(D2, [visit(D2, 0, { name: 'P' }), terminal(D2, 1, role)])], days, [
        hotel,
      ]);
      expect(shape(day)).toEqual(['morning:5', 'P', role]);
    },
  );

  it('ROADTRIP-BOOKENDS-012: a flight in the morning after a night sets off from the hotel', () => {
    const [day] = seatNightBookends(
      [planDay(D2, [terminal(D2, 0, 'departure'), terminal(D2, 0, 'arrival'), visit(D2, 0, { name: 'P' })])],
      days,
      [hotel],
    );
    expect(shape(day)).toEqual(['morning:5', 'departure', 'arrival', 'P', 'evening:5']);
    // Counted by stored stops, not by terminals.
    expect(day!.stops[4]!.ownerIndex).toBe(1);
  });
});

describe('what a stay without the facts gets', () => {
  it('ROADTRIP-BOOKENDS-013: a stay without coordinates gets no bookend, and the other side stands on its own', () => {
    const a = stay(1, D1, D2, null);
    const b = stay(2, D2, D3, WALLINGA);
    const [day] = seatNightBookends([planDay(D2, [visit(D2, 0, { name: 'P' })])], days, [a, b]);
    expect(shape(day)).toEqual(['P', 'evening:2']);
  });

  it('ROADTRIP-BOOKENDS-014: with no stay on the map at all, the plan comes back as it was', () => {
    const plan = [planDay(D2, [visit(D2, 0), visit(D2, 1)])];
    expect(seatNightBookends(plan, days, [stay(1, D1, D3, null), stay(2, D1, D3, null)])).toBe(plan);
    expect(seatNightBookends(plan, days, [stay(3, D1, D3, HOTEL, { place_id: null })])).toBe(plan);
    expect(seatNightBookends(plan, days, [])).toBe(plan);
  });

  it('ROADTRIP-BOOKENDS-015: a stay entered without a booking still stands there, with nothing to open', () => {
    const [day] = seatNightBookends([planDay(D2, [visit(D2, 0, { name: 'P' })])], days, [
      stay(5, D1, D3, HOTEL, { reservation_id: null }),
    ]);
    expect(day!.stops[0]!.bookend?.reservationId).toBeNull();
    expect(day!.stops[2]!.bookend?.reservationId).toBeNull();
  });

  it('ROADTRIP-BOOKENDS-016: a stay that begins and ends on one day is slept in by nobody', () => {
    const [day] = seatNightBookends([planDay(D2, [visit(D2, 0, { name: 'P' }), visit(D2, 1, { name: 'Q' })])], days, [
      stay(5, D2, D2, HOTEL),
    ]);
    expect(shape(day)).toEqual(['P', 'Q']);
  });
});

describe('two stays on one day', () => {
  it('ROADTRIP-BOOKENDS-017: of two checked into on one day, the evening goes to the one entered first', () => {
    const later = stay(7, D2, D3, WALLINGA);
    const earlier = stay(3, D2, D3, HOTEL);
    const [day] = seatNightBookends([planDay(D2, [visit(D2, 0), visit(D2, 1)])], days, [later, earlier]);
    expect(day!.stops[2]!.bookend?.accommodationId).toBe(3);
  });

  it('ROADTRIP-BOOKENDS-018: overlapping stays follow the day plan: woken up in the older, tonight in the one checked into', () => {
    const long = stay(1, D1, D4, HOTEL);
    const short = stay(2, D2, D3, WALLINGA);
    const plan = [planDay(D2, [visit(D2, 0, { name: 'P' })]), planDay(D3, [visit(D3, 0, { name: 'Q' })])];
    const seated = seatNightBookends(plan, days, [long, short]);
    expect(shape(seated[0])).toEqual(['morning:1', 'P', 'evening:2']);
    expect(shape(seated[1])).toEqual(['morning:1', 'Q', 'evening:1']);
  });

  it('ROADTRIP-BOOKENDS-019: the order the stays come in changes nothing', () => {
    const stays = [stay(1, D1, D4, HOTEL), stay(2, D2, D3, WALLINGA), stay(3, D2, D3, GETAWAY)];
    const plan = [planDay(D2, [visit(D2, 0)]), planDay(D3, [visit(D3, 0)])];
    expect(seatNightBookends(plan, days, [...stays].reverse())).toEqual(seatNightBookends(plan, days, stays));
  });
});

describe('what a bookend is', () => {
  const hotel = stay(5, D1, D4, HOTEL);
  const plan = [2, 3].map((n) => planDay(n * 10, [visit(n * 10, 0), visit(n * 10, 1)]));
  const seated = seatNightBookends(plan, days, [hotel]);
  const bookends = seated.flatMap((d) => d.stops.filter((s) => s.bookend));

  it('ROADTRIP-BOOKENDS-020: one id per day and phase, the same every run, and below every terminal', () => {
    const ids = bookends.map((s) => s.assignmentId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      bookendAssignmentId(D2, 'morning'),
      bookendAssignmentId(D2, 'evening'),
      bookendAssignmentId(D3, 'morning'),
      bookendAssignmentId(D3, 'evening'),
    ]);
    expect(seatNightBookends(plan, days, [hotel]).flatMap((d) => d.stops.map((s) => s.assignmentId))).toEqual(
      seated.flatMap((d) => d.stops.map((s) => s.assignmentId)),
    );
    for (const id of ids) expect(id).toBeLessThan(terminalAssignmentId(1_000_000, 'arrival'));
  });

  it('ROADTRIP-BOOKENDS-021: never a clock, a stay, a mode or a night of its own, whatever the stay says', () => {
    const [day] = seatNightBookends([planDay(D4, [visit(D4, 0), visit(D4, 1)])], days, [
      stay(5, D1, D4, HOTEL, { check_out: '11:00' }),
    ]);
    const all = [...bookends, day!.stops[0]!];
    expect(day!.stops[0]!.bookend?.checkOut).toBe('11:00');
    for (const s of all) {
      expect(s).toMatchObject({
        time: null,
        leaveAt: null,
        checkInTime: null,
        dwellMinutes: 0,
        night: false,
        endDay: false,
        legMode: null,
        incomingLegMode: null,
        fillPercent: null,
      });
    }
  });

  it('ROADTRIP-BOOKENDS-022: a day with a bookend has two stops or more, and stands as a day for it', () => {
    const everyCase = [
      ...seated,
      ...seatNightBookends([planDay(D2, [])], days, [stay(1, D1, D2, GETAWAY), stay(2, D2, D3, WALLINGA)]),
      ...seatNightBookends([planDay(D2, [visit(D2, 0)])], days, [hotel]),
      ...seatNightBookends([planDay(D4, [visit(D4, 0)])], days, [hotel]),
    ];
    for (const day of everyCase.filter((d) => d.stops.some((s) => s.bookend))) {
      expect(day.stops.length).toBeGreaterThanOrEqual(2);
      expect(standsAsDay(day.stops)).toBe(true);
    }
  });

  it('ROADTRIP-BOOKENDS-023: a day the trip does not list is passed over', () => {
    const stray = planDay(990, [visit(990, 0), visit(990, 1)]);
    const out = seatNightBookends([stray], days, [hotel]);
    expect(out[0]).toBe(stray);
  });
});

describe('a night spent at one hotel', () => {
  const at = (over: Partial<RoadtripStop>) => visit(D2, 0, { lat: HOTEL[0], lng: HOTEL[1], ...over });
  const evening = at({
    bookend: {
      phase: 'evening',
      accommodationId: 5,
      reservationId: null,
      checkingOut: false,
      checkingIn: false,
      checkOut: null,
    },
  });
  const morning = at({
    bookend: {
      phase: 'morning',
      accommodationId: 5,
      reservationId: null,
      checkingOut: false,
      checkingIn: false,
      checkOut: null,
    },
  });
  const drive: RoutedLeg = {
    seg: {
      from: HOTEL,
      to: HOTEL,
      mid: HOTEL,
      distance: 172_000,
      duration: 7200,
      mode: 'driving',
      walkingText: '',
      drivingText: '',
      distanceText: '',
    },
    line: [HOTEL, [45.2, 7.7], HOTEL],
    vias: [],
  };

  it('ROADTRIP-BOOKENDS-024: is a join only where a bookend stands at one end and both are one spot', () => {
    expect(isStationaryJoin(evening, morning)).toBe(true);
    expect(isStationaryJoin(at({}), morning)).toBe(true);
    expect(isStationaryJoin(evening, at({}))).toBe(true);
    // Two stored stops on one spot are a stop visited twice, not a night.
    expect(isStationaryJoin(at({}), at({}))).toBe(false);
    expect(isStationaryJoin(evening, { ...morning, lat: WALLINGA[0], lng: WALLINGA[1] })).toBe(false);
  });

  it('ROADTRIP-BOOKENDS-025: goes nowhere whatever was fetched for the pair, and every other pair is looked up', () => {
    const lookup = withStationaryJoins(() => drive);
    const night = lookup(evening, morning)!;
    expect(night.seg.distance).toBe(0);
    expect(night.seg.duration).toBe(0);
    expect(night.line).toEqual([]);
    expect(lookup(at({}), at({}))).toBe(drive);
    expect(withStationaryJoins(() => undefined)(at({}), visit(D2, 1))).toBeUndefined();
  });
});

describe('the stays the rule reads, and the switch', () => {
  it('ROADTRIP-BOOKENDS-026: each stay once, with its earliest booking; the switch is on only when set on', () => {
    const accommodations = [
      {
        id: 1,
        place_id: 11,
        start_day_id: D1,
        end_day_id: D2,
        place_lat: 1,
        place_lng: 2,
        place_name: 'A',
        check_out: '10:00',
      },
      {
        id: 1,
        place_id: 11,
        start_day_id: D1,
        end_day_id: D2,
        place_lat: 1,
        place_lng: 2,
        place_name: 'A',
        check_out: '10:00',
      },
      { id: 2, place_id: 12, start_day_id: D2, end_day_id: D3 },
    ];
    const reservations = [
      { id: 40, accommodation_id: '1' },
      { id: 31, accommodation_id: 1 },
      { id: 12, accommodation_id: null },
      { id: 5, accommodation_id: '' },
    ];
    expect(bookendStaysOf(accommodations, reservations)).toEqual([
      {
        id: 1,
        place_id: 11,
        start_day_id: D1,
        end_day_id: D2,
        place_lat: 1,
        place_lng: 2,
        place_name: 'A',
        check_out: '10:00',
        reservation_id: 31,
      },
      {
        id: 2,
        place_id: 12,
        start_day_id: D2,
        end_day_id: D3,
        place_lat: null,
        place_lng: null,
        place_name: null,
        check_out: null,
        reservation_id: null,
      },
    ]);
    expect(hotelBookendsOn({ roadtrip_hotel_bookends: true })).toBe(true);
    expect(hotelBookendsOn({ roadtrip_hotel_bookends: false })).toBe(false);
    expect(hotelBookendsOn({})).toBe(false);
    expect(hotelBookendsOn({ roadtrip_hotel_bookends: null })).toBe(false);
  });
});

describe('with the switch off', () => {
  it('ROADTRIP-BOOKENDS-027: the plan is the one stored, stop for stop, whatever stays the trip holds', () => {
    const hotel = stay(5, D1, D4, HOTEL);
    const plan = [
      planDay(D1, [stayStop(D1, 0, HOTEL, { name: 'H' }), visit(D1, 1, { name: 'P1' })]),
      planDay(D2, [visit(D2, 0, { name: 'P2' })]),
      planDay(D4, []),
    ];
    const read = (on: boolean) => (on ? seatNightBookends(plan, days, [hotel]) : plan);
    const off = read(hotelBookendsOn({}));
    expect(off).toBe(plan);
    expect(off.map(shape)).toEqual([['H', 'P1'], ['P2'], []]);
    // Only the switch set on seats anything.
    expect(read(hotelBookendsOn({ roadtrip_hotel_bookends: true })).map(shape)).toEqual([
      ['H', 'P1', 'evening:5'],
      ['morning:5', 'P2', 'evening:5'],
      [],
    ]);
  });
});
