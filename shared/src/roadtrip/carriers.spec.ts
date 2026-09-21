/**
 * ROADTRIP-CARRIERS-001..014: a booking the traveller rides becomes a seam in the drive.
 *
 * The road ends at the terminal the ride leaves from and starts again at the one it
 * lands at (#2428). Pinned here: which bookings count, where their terminals are seated
 * among the day's stops, what the ride between them is worth to the chain, and that
 * nothing about a terminal reads as a stored stop.
 */
import { assembleRoadtrip } from './assemble';
import {
  CHECK_IN_MINUTES,
  carrierClock,
  carrierLeg,
  carrierLegsFor,
  carrierReservationIds,
  carrierRideMinutes,
  carrierSeam,
  carriesTheCar,
  isCarrierMode,
  isCarrierStop,
  seatCarrierStops,
  terminalAssignmentId,
  viasLeaving,
  type CarrierBooking,
} from './carriers';
import { planDayWindow } from './dayWindow';
import type { PlanDay, RoadtripStop, RoutedLeg } from './planning-types';
import { roadtripLegKey } from './routeRun';

import { describe, expect, it } from 'vitest';

const stop = (over: Partial<RoadtripStop> & { ownerIndex: number; ownerDayId?: number }): RoadtripStop => ({
  assignmentId: 100 + over.ownerIndex,
  ownerDayId: 1,
  placeId: 200 + over.ownerIndex,
  name: `Stop ${over.ownerIndex}`,
  lat: 50 + over.ownerIndex * 0.1,
  lng: 10,
  time: null,
  dwellMinutes: 30,
  legMode: null,
  incomingLegMode: null,
  stopType: null,
  ...over,
});

const flight = (over: Partial<CarrierBooking> = {}): CarrierBooking => ({
  id: 7,
  type: 'flight',
  title: 'LH 2020 MUC → HAM',
  day_id: 1,
  end_day_id: 1,
  reservation_time: '2026-06-01T13:20',
  reservation_end_time: '2026-06-01T14:30',
  endpoints: [
    { role: 'from', sequence: 0, name: 'Munich Airport', code: 'MUC', lat: 48.35, lng: 11.78 },
    { role: 'to', sequence: 1, name: 'Hamburg Airport', code: 'HAM', lat: 53.63, lng: 9.99 },
  ],
  ...over,
});

const road = (km: number): RoutedLeg => ({
  seg: {
    mid: [50, 10],
    from: [50, 10],
    to: [51, 10],
    distance: km * 1000,
    duration: km * 60,
    walkingText: '',
    drivingText: '',
    distanceText: `${km} km`,
    mode: 'driving',
  },
  line: [
    [50, 10],
    [51, 10],
  ],
  vias: [],
});

describe('carrierSeam', () => {
  it('ROADTRIP-CARRIERS-001: a flight with two located terminals is a seam with the timetable on both ends', () => {
    const seam = carrierSeam(flight());
    expect(seam).not.toBeNull();
    expect(seam!.departure).toMatchObject({ dayId: 1, clock: '13:20', code: 'MUC', lat: 48.35 });
    expect(seam!.arrival).toMatchObject({ dayId: 1, clock: '14:30', code: 'HAM', lng: 9.99 });
    expect(seam!.departure.position).toBeNull();
  });

  it('ROADTRIP-CARRIERS-002: a hire car, a taxi and a hop on transit are not seams, and neither is a ride nobody put on a day', () => {
    expect(carrierSeam(flight({ type: 'car' }))).toBeNull();
    expect(carrierSeam(flight({ type: 'taxi' }))).toBeNull();
    expect(carrierSeam(flight({ type: 'transit' }))).toBeNull();
    expect(carrierSeam(flight({ day_id: null }))).toBeNull();
  });

  it('ROADTRIP-CARRIERS-003: a terminal without coordinates leaves no seam, because the drive cannot resume from nowhere', () => {
    const half = flight({
      endpoints: [
        { role: 'from', sequence: 0, name: 'Munich Airport', code: 'MUC', lat: 48.35, lng: 11.78 },
        { role: 'to', sequence: 1, name: 'Somewhere', code: null, lat: null, lng: null },
      ],
    });
    expect(carrierSeam(half)).toBeNull();
  });

  it('ROADTRIP-CARRIERS-004: a booking with a stopover is one seam from its first departure to its last arrival, on the legs’ own days and clocks', () => {
    const legs = JSON.stringify({
      legs: [
        { from: 'MUC', to: 'FRA', dep_day_id: 1, dep_time: '18:00', arr_day_id: 1, arr_time: '19:00' },
        {
          from: 'FRA',
          to: 'JFK',
          dep_day_id: 1,
          dep_time: '22:00',
          arr_day_id: 2,
          arr_time: '01:30',
          day_positions: { '2': 0 },
        },
      ],
    });
    const seam = carrierSeam(
      flight({
        reservation_time: null,
        reservation_end_time: null,
        metadata: legs,
        endpoints: [
          { role: 'from', sequence: 0, name: 'Munich', code: 'MUC', lat: 48.35, lng: 11.78 },
          { role: 'stop', sequence: 1, name: 'Frankfurt', code: 'FRA', lat: 50.03, lng: 8.56 },
          { role: 'to', sequence: 2, name: 'New York', code: 'JFK', lat: 40.64, lng: -73.78 },
        ],
      }),
    );
    expect(seam!.departure).toMatchObject({ dayId: 1, clock: '18:00', code: 'MUC' });
    expect(seam!.arrival).toMatchObject({ dayId: 2, clock: '01:30', code: 'JFK', position: 0 });
  });

  it('ROADTRIP-CARRIERS-005: a position somebody dragged the booking to is read per day, the booking’s own slot as the fallback', () => {
    const seam = carrierSeam(flight({ day_positions: { '1': 2 }, day_plan_position: 5 }));
    expect(seam!.departure.position).toBe(2);
    const legacy = carrierSeam(flight({ day_plan_position: 5 }));
    expect(legacy!.departure.position).toBe(5);
  });

  it('ROADTRIP-CARRIERS-006: clocks come out as HH:mm whichever way the column spells them', () => {
    expect(carrierClock('2026-06-01T13:20')).toBe('13:20');
    expect(carrierClock('7:05')).toBe('07:05');
    expect(carrierClock('13:20:00')).toBe('13:20');
    expect(carrierClock(null)).toBeNull();
    expect(carrierClock('noon')).toBeNull();
  });
});

describe('carrierRideMinutes', () => {
  it('ROADTRIP-CARRIERS-007: the ride is what the clocks say, across the days the booking spans, and never negative', () => {
    const same = carrierSeam(flight())!;
    expect(carrierRideMinutes(same, 0)).toBe(70);
    const overnight = carrierSeam(flight({ reservation_time: '22:00', reservation_end_time: '07:00', end_day_id: 2 }))!;
    expect(carrierRideMinutes(overnight, 1)).toBe(540);
    // Westward across the date line the clock lands before it left; the chain cannot
    // run backwards, so the ride counts as none rather than as a day.
    const dateLine = carrierSeam(flight({ reservation_time: '10:00', reservation_end_time: '06:00' }))!;
    expect(carrierRideMinutes(dateLine, 0)).toBe(0);
    expect(carrierRideMinutes(carrierSeam(flight({ reservation_end_time: null }))!, 0)).toBeNull();
  });
});

describe('seatCarrierStops', () => {
  const day = [
    stop({ ownerIndex: 0, time: '09:00' }),
    stop({ ownerIndex: 1, time: '10:00' }),
    stop({ ownerIndex: 2 }),
    stop({ ownerIndex: 3, time: '17:00' }),
  ];

  it('ROADTRIP-CARRIERS-008: a same-day ride is seated behind the last timed stop at or before its departure, arrival right behind departure', () => {
    const seam = carrierSeam(flight())!;
    const seated = seatCarrierStops(1, day, [0, 1, 2, 3], [seam]);
    // Behind Stop 1 (10:00), and the untimed Stop 2 follows the ride: the day plan reads
    // an untimed item as standing behind the timed one before it.
    expect(seated.map((s) => s.carrier?.role ?? s.name)).toEqual([
      'Stop 0',
      'Stop 1',
      'departure',
      'arrival',
      'Stop 2',
      'Stop 3',
    ]);
    const dep = seated[2]!;
    const arr = seated[3]!;
    // Pinned a check-in ahead of the timetable and left at the timetable's minute.
    expect(dep.time).toBe('12:20');
    expect(dep.leaveAt).toBe('13:20');
    expect(dep.dwellMinutes).toBe(CHECK_IN_MINUTES.flight);
    expect(arr.time).toBe('14:30');
    expect(arr.dwellMinutes).toBe(0);
    // The ride is the leg's mode, on the departure's way out and the arrival's way in.
    expect(dep.legMode).toBe('flight');
    expect(arr.incomingLegMode).toBe('flight');
    // Neither is a stored stop: ids below every assignment and every automatic night,
    // a negative place, and the index of the stop that follows them in the stored list.
    expect(dep.assignmentId).toBe(terminalAssignmentId(7, 'departure'));
    expect(arr.assignmentId).toBe(terminalAssignmentId(7, 'arrival'));
    expect(dep.assignmentId).toBeLessThan(-2_000_000_000);
    expect(dep.placeId).toBeLessThan(0);
    expect(dep.ownerIndex).toBe(2);
    expect(arr.ownerIndex).toBe(2);
    expect(isCarrierStop(dep)).toBe(true);
    expect(isCarrierStop(day[0])).toBe(false);
  });

  it('ROADTRIP-CARRIERS-009: a dragged position decides among untimed stops, and a ride before every timed stop opens the day', () => {
    // Three stops without a clock: the ride would close the day, but somebody dragged
    // the booking behind the first stop in the day plan, and that is where it sits.
    const untimedDay = [stop({ ownerIndex: 0 }), stop({ ownerIndex: 1 }), stop({ ownerIndex: 2 })];
    const dragged = carrierSeam(flight({ day_positions: { '1': 0 } }))!;
    expect(seatCarrierStops(1, untimedDay, [0, 1, 2], [dragged]).map((s) => s.carrier?.role ?? s.name)).toEqual([
      'Stop 0',
      'departure',
      'arrival',
      'Stop 1',
      'Stop 2',
    ]);
    // Among timed stops the clock has the last word, as it has in the day plan: a booking
    // dragged to the top of the day still reads after the stops that come before it in time.
    expect(seatCarrierStops(1, day, [0, 1, 2, 3], [dragged]).map((s) => s.carrier?.role ?? s.name)).toEqual([
      'Stop 0',
      'Stop 1',
      'Stop 2',
      'departure',
      'arrival',
      'Stop 3',
    ]);
    const early = carrierSeam(flight({ reservation_time: '06:00', reservation_end_time: '07:10' }))!;
    expect(seatCarrierStops(1, day, [0, 1, 2, 3], [early]).map((s) => s.carrier?.role ?? s.name)).toEqual([
      'departure',
      'arrival',
      'Stop 0',
      'Stop 1',
      'Stop 2',
      'Stop 3',
    ]);
  });

  it('ROADTRIP-CARRIERS-010: a ride without a clock and without a position goes to the end of the day, as the day plan shows it', () => {
    const untimed = carrierSeam(flight({ reservation_time: null, reservation_end_time: null }))!;
    const seated = seatCarrierStops(1, day, [0, 1, 2, 3], [untimed]);
    expect(seated.map((s) => s.carrier?.role ?? s.name)).toEqual([
      'Stop 0',
      'Stop 1',
      'Stop 2',
      'Stop 3',
      'departure',
      'arrival',
    ]);
    expect(seated[4]!.time).toBeNull();
    expect(seated[4]!.dwellMinutes).toBe(0);
  });

  it('ROADTRIP-CARRIERS-011: a ride landing on a later day seats its arrival on that day, and only there', () => {
    const overnight = carrierSeam(flight({ reservation_time: '22:00', reservation_end_time: '07:00', end_day_id: 2 }))!;
    const first = seatCarrierStops(1, day, [0, 1, 2, 3], [overnight]);
    expect(first.map((s) => s.carrier?.role ?? s.name)).toEqual(['Stop 0', 'Stop 1', 'Stop 2', 'Stop 3', 'departure']);
    // The arrival opens its day even when nothing on that day has a clock.
    const next = [stop({ ownerIndex: 0, ownerDayId: 2 })];
    const second = seatCarrierStops(2, next, [0], [overnight]);
    expect(second.map((s) => s.carrier?.role ?? s.name)).toEqual(['arrival', 'Stop 0']);
    expect(second[0]!.ownerDayId).toBe(2);
    expect(second[0]!.ownerIndex).toBe(0);
    expect(seatCarrierStops(3, [], [], [overnight])).toEqual([]);
  });
});

describe('the ride as a leg', () => {
  it('ROADTRIP-CARRIERS-012: a ride is a leg with minutes, no road and no distance, in the booking’s mode', () => {
    const seam = carrierSeam(flight())!;
    const [dep, arr] = seatCarrierStops(1, [], [], [seam]);
    const legs = carrierLegsFor([dep!, arr!], 'flight', () => 0, roadtripLegKey)!;
    const ride = legs[roadtripLegKey(dep!, arr!)]!;
    expect(ride.seg.mode).toBe('flight');
    expect(ride.seg.duration).toBe(70 * 60);
    expect(ride.seg.distance).toBe(0);
    expect(ride.line).toEqual([]);
    expect(ride.seg.durationText).toBe('1 h 10 min');
    expect(isCarrierMode(ride.seg.mode)).toBe(true);
    expect(carrierLegsFor([dep!, arr!], 'driving', () => 0, roadtripLegKey)).toBeNull();
    expect(carrierLeg(dep!, arr!, null).seg.durationText).toBe('');
    expect(carriesTheCar('ferry')).toBe(true);
    expect(carriesTheCar('flight')).toBe(false);
  });

  it('ROADTRIP-CARRIERS-013: no via leaves a terminal, however many are filed at the index it stands in for', () => {
    const vias = [{ day_id: 1, after_order_index: 2, sequence: 0, lat: 1, lng: 1 }];
    const seam = carrierSeam(flight())!;
    const seated = seatCarrierStops(
      1,
      [
        stop({ ownerIndex: 0, time: '09:00' }),
        stop({ ownerIndex: 1, time: '10:00' }),
        stop({ ownerIndex: 2, time: '17:00' }),
      ],
      [0, 1, 2],
      [seam],
    );
    const arrival = seated.find((s) => s.carrier?.role === 'arrival')!;
    expect(arrival.ownerIndex).toBe(2);
    expect(viasLeaving(arrival, vias)).toEqual([]);
    expect(viasLeaving(seated[4]!, vias)).toHaveLength(1);
    expect(carrierReservationIds([{ stops: seated }])).toEqual([7]);
  });
});

describe('the ride in the drive', () => {
  const seam = carrierSeam(flight({ reservation_time: '13:20', reservation_end_time: '14:30' }))!;
  const stops = seatCarrierStops(
    1,
    [stop({ ownerIndex: 0, time: '09:00', dwellMinutes: 0 }), stop({ ownerIndex: 1, time: '10:00', dwellMinutes: 0 })],
    [0, 1],
    [seam],
  );
  const [a, b, dep, arr] = stops as [RoadtripStop, RoadtripStop, RoadtripStop, RoadtripStop];
  const allLegs: Record<string, RoutedLeg> = {
    [roadtripLegKey(a, b)]: road(60),
    [roadtripLegKey(b, dep)]: road(30),
    ...carrierLegsFor([dep, arr], 'flight', () => 0, roadtripLegKey)!,
  };
  const plan: PlanDay[] = [{ dayId: 1, dayNumber: 1, date: '2026-06-01', title: null, stops }];

  it('ROADTRIP-CARRIERS-014: the day counts its road and not its ride, and the terminals are not destinations', () => {
    const routes = assembleRoadtrip({
      plan,
      quietDays: [],
      window: null,
      distanceUnit: 'metric',
      allLegs,
      snapByDay: {},
      missedByDay: {},
      loading: false,
      limits: { legMinutes: null, dayMinutes: null, rangeKm: 50 },
      vehicleKind: 'combustion',
      connectDays: false,
      boundaries: [],
      labels: { start: 'go', end: 'stop' },
    });
    const day = routes.days[0]!;
    expect(day.distance).toBe(90_000);
    expect(day.duration).toBe(90 * 60);
    expect(routes.totalStops).toBe(2);
    // The ride is no line on the map and no labelled segment; the arc is the booking's.
    expect(routes.lines).toHaveLength(2);
    expect(routes.segments.map((s) => s.mode)).toEqual(['driving', 'driving']);
    // The chain still runs through it: the terminal is reached a check-in ahead of the
    // flight, the flight leaves on the timetable, the far end lands on the timetable.
    expect(day.schedule.entries.map((e) => [e.arrival, e.departure])).toEqual([
      ['09:00', '09:00'],
      ['10:00', '10:00'],
      ['12:20', '13:20'],
      ['14:30', '14:30'],
    ]);
    // A 50 km range and 90 km of road before the flight: the warning belongs to the
    // drive, and after the flight the tank is another car's, so nothing carries over.
    expect(day.driveWarnings.some((w) => w.code === 'range')).toBe(true);
    expect(day.dryPoints?.every((p) => p.legIndex < 2)).toBe(true);
  });

  it('ROADTRIP-CARRIERS-015: with a daily window, an overnight ride carries the clock to the day it lands on without a night marker on the flight', () => {
    const overnight = carrierSeam(flight({ reservation_time: '22:00', reservation_end_time: '07:00', end_day_id: 2 }))!;
    const dayOne = seatCarrierStops(1, [stop({ ownerIndex: 0, time: '18:00', dwellMinutes: 0 })], [0], [overnight]);
    const dayTwo = seatCarrierStops(
      2,
      [stop({ ownerIndex: 0, ownerDayId: 2, dwellMinutes: 0, lat: 53.7, lng: 10.1 })],
      [0],
      [overnight],
    );
    const [origin, departure] = dayOne as [RoadtripStop, RoadtripStop];
    const [arrival, hotel] = dayTwo as [RoadtripStop, RoadtripStop];
    const legs: Record<string, RoutedLeg> = {
      [roadtripLegKey(origin, departure)]: road(30),
      [roadtripLegKey(arrival, hotel)]: road(20),
      ...carrierLegsFor([departure, arrival], 'flight', () => 1, roadtripLegKey)!,
    };
    const days: PlanDay[] = [
      { dayId: 1, dayNumber: 1, date: '2026-06-01', title: null, stops: dayOne },
      { dayId: 2, dayNumber: 2, date: '2026-06-02', title: null, stops: dayTwo },
    ];
    const timed = planDayWindow(days, { start: 8 * 60, end: 20 * 60 }, (f, t) => legs[roadtripLegKey(f, t)], 'metric', {
      start: 'go',
      end: 'stop',
    });
    expect(timed.issue).toBeNull();
    const chainOne = timed.chains.find((c) => c.dayNumber === 1)!;
    const chainTwo = timed.chains.find((c) => c.dayNumber === 2)!;
    expect(chainOne.stops.map((s) => s.carrier?.role ?? s.name)).toEqual(['Stop 0', 'departure']);
    expect(chainOne.schedule.entries[1]).toMatchObject({ arrival: '21:00', departure: '22:00' });
    expect(chainTwo.stops.map((s) => s.carrier?.role ?? s.name)).toEqual(['arrival', 'Stop 0']);
    expect(chainTwo.schedule.entries[0]).toMatchObject({ arrival: '07:00' });
    expect(chainTwo.stops.some((s) => s.automaticNight)).toBe(false);
  });
});
