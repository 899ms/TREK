/**
 * RoadtripPlanService against the worker's real SQLite schema.
 *
 * The planning SELECT is the one place the server reads a visit's times for the road
 * trip, and the tests beside the MCP tools hand the service its rows by hand, so a
 * column the statement never selects would go unnoticed there. These run the statement.
 */
import { db } from '../../../src/db/database';
import type { McpContext } from '../../../src/nest-mcp';
import { DatabaseService } from '../../../src/nest/database/database.service';
import { RoadtripPlanService } from '../../../src/nest/roadtrip/roadtrip-plan.service';
import { RoadtripPlanningMcp } from '../../../src/nest/roadtrip/roadtrip-planning.mcp';
import { createDay, createDayAccommodation, createDayAssignment, createPlace, createTrip, createUser } from '../../helpers/factories';
import { resetTestDb } from '../../helpers/test-db';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every leg an hour and 60 km, whatever it joins. */
function hourlyRouter() {
  return {
    profiles: () => ['driving'],
    route: vi.fn(async (_user: number, _trip: number, _day: number, points: { lat: number; lng: number }[]) => ({
      parts: points.slice(1).map(() => ({ distance: 60000, duration: 3600 })),
      avoidMissed: [],
      leg: {
        line: points.map((p) => [p.lat, p.lng]),
        vias: [],
        seg: {
          from: [points[0].lat, points[0].lng],
          to: [points[points.length - 1].lat, points[points.length - 1].lng],
          mid: [points[0].lat, points[0].lng],
          distance: 60000 * (points.length - 1),
          duration: 3600 * (points.length - 1),
          mode: 'driving',
          distanceText: '',
          drivingText: '',
          walkingText: '',
        },
      },
    })),
  };
}

function setup() {
  const { user } = createUser(db);
  const trip = createTrip(db, user.id);
  const day = createDay(db, trip.id);
  const visits = ['Hamburg', 'Lueneburg', 'Celle'].map((name, i) => {
    const place = createPlace(db, trip.id, { name, lat: 53 - i * 0.3, lng: 10 });
    db.prepare('UPDATE places SET duration_minutes = ? WHERE id = ?').run(i === 0 ? 0 : 30, place.id);
    return createDayAssignment(db, day.id, place.id);
  });
  db.prepare("UPDATE day_assignments SET assignment_time = '09:00' WHERE id = ?").run(visits[0].id);
  const plans = new RoadtripPlanService(
    new DatabaseService(db),
    { getUserSettings: () => ({}) } as never,
    { read: () => ({}) } as never,
    hourlyRouter() as never,
    { listForTrip: () => [], tracksForTrip: () => [] } as never,
    { list: () => [] } as never,
  );
  return { user, trip, visits, plans };
}

beforeEach(() => {
  resetTestDb(db);
});

describe('a visit end time on the road trip', () => {
  it('is read from the visit, and from the place when the visit has none', () => {
    const { user, trip, visits, plans } = setup();
    db.prepare("UPDATE day_assignments SET assignment_end_time = '14:00' WHERE id = ?").run(visits[1].id);
    db.prepare(
      "UPDATE places SET end_time = '18:00' WHERE id = (SELECT place_id FROM day_assignments WHERE id = ?)",
    ).run(visits[2].id);

    const context = plans.context(trip.id, user.id);

    expect(context.visits.map((v) => [v.name, v.end_time])).toEqual([
      ['Hamburg', null],
      ['Lueneburg', '14:00'],
      ['Celle', '18:00'],
    ]);
  });

  it('is when the drive leaves the stop, in place of its stay', async () => {
    const { user, trip, visits, plans } = setup();
    db.prepare("UPDATE day_assignments SET assignment_end_time = '14:00' WHERE id = ?").run(visits[1].id);

    const { calculated } = await plans.calculate(trip.id, user.id);
    const day = calculated.days[0];

    expect(day.stops[1]).toMatchObject({ name: 'Lueneburg', leaveAt: '14:00' });
    expect(day.schedule.entries.map((e) => [e.arrival, e.departure])).toEqual([
      ['09:00', '09:00'],
      ['10:00', '14:00'],
      ['15:00', '15:30'],
    ]);
    expect(day.schedule.warnings).toEqual([]);
  });

  it('is reported when the drive gets there after it', async () => {
    const { user, trip, visits, plans } = setup();
    db.prepare("UPDATE day_assignments SET assignment_end_time = '09:30' WHERE id = ?").run(visits[1].id);

    const { calculated } = await plans.calculate(trip.id, user.id);

    expect(calculated.days[0].schedule.warnings).toEqual([{ index: 1, code: 'missedLeave', minutes: 30 }]);
    expect(calculated.days[0].schedule.entries[1]).toMatchObject({ arrival: '10:00', departure: '10:00' });
  });

  it('leaves a stop without one to its stay', async () => {
    const { user, trip, plans } = setup();

    const { calculated } = await plans.calculate(trip.id, user.id);

    expect(calculated.days[0].schedule.entries[1]).toMatchObject({ arrival: '10:00', departure: '10:30' });
    expect(calculated.days[0].stops[1].leaveAt).toBeNull();
  });
});

describe('a booked night on the road trip (#2410)', () => {
  // The night flag comes off the planning SELECT (stay.id), not off a row the tests
  // hand the service, so a column dropped from the statement would flip every stop
  // to a night here and nowhere else.
  it('marks the stop the night is booked at, and a day that is only its night stands among the days', async () => {
    const { user, trip, plans } = setup();
    const arrival = createDay(db, trip.id);
    const hotel = createPlace(db, trip.id, { name: 'Rostock', lat: 54.09, lng: 12.1 });
    createDayAssignment(db, arrival.id, hotel.id);
    createDayAccommodation(db, trip.id, hotel.id, arrival.id, arrival.id, { check_in: '15:00' });

    const { context, calculated } = await plans.calculate(trip.id, user.id);

    expect(context.visits.map((v) => [v.name, v.stay_id !== null])).toEqual([
      ['Hamburg', false],
      ['Lueneburg', false],
      ['Celle', false],
      ['Rostock', true],
    ]);
    expect(calculated.quietDays).toEqual([]);
    expect(calculated.days.map((d) => d.dayId)).toContain(arrival.id);
    const night = calculated.days.find((d) => d.dayId === arrival.id)!;
    expect(night.stops.map((s) => [s.name, s.night])).toEqual([['Rostock', true]]);
    expect(night.legs).toEqual([]);
    expect(night.schedule.entries[0]).toMatchObject({ arrival: '15:00', anchored: true });
  });

  it('files a lone stop that is no night under the quiet days', async () => {
    const { user, trip, plans } = setup();
    const quiet = createDay(db, trip.id);
    const museum = createPlace(db, trip.id, { name: 'Museum', lat: 54.09, lng: 12.1 });
    createDayAssignment(db, quiet.id, museum.id);

    const { calculated } = await plans.calculate(trip.id, user.id);

    expect(calculated.days.map((d) => d.dayId)).not.toContain(quiet.id);
    expect(calculated.quietDays.map((d) => d.dayId)).toEqual([quiet.id]);
  });
});

describe('a booking the traveller rides (#2428)', () => {
  function withFlight(dayId: number, tripId: number, over: { end_day_id?: number; dep?: string; arr?: string } = {}) {
    const result = db
      .prepare(
        `INSERT INTO reservations (trip_id, title, type, day_id, end_day_id, reservation_time, reservation_end_time)
         VALUES (?, ?, 'flight', ?, ?, ?, ?)`,
      )
      .run(tripId, 'LH 2020 HAM → MUC', dayId, over.end_day_id ?? dayId, over.dep ?? '13:20', over.arr ?? '14:30');
    const id = Number(result.lastInsertRowid);
    const endpoint = db.prepare(
      'INSERT INTO reservation_endpoints (reservation_id, role, sequence, name, code, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    endpoint.run(id, 'from', 0, 'Hamburg Airport', 'HAM', 53.63, 9.99);
    endpoint.run(id, 'to', 1, 'Munich Airport', 'MUC', 48.35, 11.78);
    return id;
  }

  it('seats the terminals in the day and never asks the router for the ride', async () => {
    const { user, trip, visits, plans } = setup();
    db.prepare("UPDATE day_assignments SET assignment_time = '10:00' WHERE id = ?").run(visits[1].id);
    // Pinned to the minute the drive reaches it anyway, so the clock alone seats the
    // flight here. Untimed, Celle lies south of Lueneburg with the airport north of both,
    // and the flight would go where it adds the least road (#2461, see below).
    db.prepare("UPDATE day_assignments SET assignment_time = '15:30' WHERE id = ?").run(visits[2].id);
    const day = db.prepare('SELECT day_id FROM day_assignments WHERE id = ?').get(visits[0].id) as { day_id: number };
    const flightId = withFlight(day.day_id, trip.id);

    const { context, calculated } = await plans.calculate(trip.id, user.id);

    expect(context.carriers).toHaveLength(1);
    expect(context.carriers[0].endpoints).toHaveLength(2);
    const card = calculated.days[0];
    // Behind Lueneburg (10:00), before Celle (15:30): the day plan's own seat.
    expect(card.stops.map((s) => s.carrier?.role ?? s.name)).toEqual(['Hamburg', 'Lueneburg', 'departure', 'arrival', 'Celle']);
    const departure = card.stops[2];
    expect(departure.carrier).toMatchObject({ reservationId: flightId, type: 'flight', code: 'HAM', at: '13:20' });
    expect(departure.assignmentId).toBeLessThan(-2_000_000_000);
    // The ride is a leg of the booking's minutes with no road under it; the roads to
    // and from the terminals were routed like any other leg.
    expect(card.legs.map((l) => [l?.mode, l?.duration])).toEqual([
      ['driving', 3600],
      ['driving', 3600],
      ['flight', 70 * 60],
      ['driving', 3600],
    ]);
    expect(card.legs[2]?.distance).toBe(0);
    // Reached an hour ahead of the flight, off on the timetable, landed on the timetable.
    expect(card.schedule.entries.map((e) => [e.arrival, e.departure])).toEqual([
      ['09:00', '09:00'],
      ['10:00', '10:30'],
      ['12:20', '13:20'],
      ['14:30', '14:30'],
      ['15:30', '16:00'],
    ]);
    // The day's figures are the drive's: three roads of 60 km, no flight in them.
    expect(card.distance).toBe(180_000);
    expect(calculated.totalStops).toBe(3);
  });

  it('lets a booking without located terminals fall through, a hire car without a desk among them', async () => {
    const { user, trip, visits, plans } = setup();
    const day = db.prepare('SELECT day_id FROM day_assignments WHERE id = ?').get(visits[0].id) as { day_id: number };
    db.prepare("INSERT INTO reservations (trip_id, title, type, day_id) VALUES (?, 'Hire car', 'car', ?)").run(trip.id, day.day_id);
    db.prepare("INSERT INTO reservations (trip_id, title, type, day_id, reservation_time) VALUES (?, 'Somewhere', 'train', ?, '11:00')").run(trip.id, day.day_id);
    db.prepare("INSERT INTO reservations (trip_id, title, type, day_id, reservation_time) VALUES (?, 'Cab', 'taxi', ?, '11:00')").run(trip.id, day.day_id);

    const { context, calculated } = await plans.calculate(trip.id, user.id);

    expect(context.carriers.map((c) => c.type).sort()).toEqual(['car', 'train']);
    expect(calculated.days[0].stops.every((s) => !s.carrier)).toBe(true);
  });

  it("puts a hire car's desks on the road: the pick-up opens the day, the return closes it, one run through both", async () => {
    const { user, trip, visits, plans } = setup();
    db.prepare("UPDATE day_assignments SET assignment_time = '10:00' WHERE id = ?").run(visits[1].id);
    db.prepare("UPDATE day_assignments SET assignment_time = '12:00' WHERE id = ?").run(visits[2].id);
    const day = db.prepare('SELECT day_id FROM day_assignments WHERE id = ?').get(visits[0].id) as { day_id: number };
    const result = db
      .prepare(
        `INSERT INTO reservations (trip_id, title, type, day_id, end_day_id, reservation_time, reservation_end_time)
         VALUES (?, 'Sixt', 'car', ?, ?, '08:00', '18:00')`,
      )
      .run(trip.id, day.day_id, day.day_id);
    const carId = Number(result.lastInsertRowid);
    const endpoint = db.prepare(
      'INSERT INTO reservation_endpoints (reservation_id, role, sequence, name, code, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    endpoint.run(carId, 'from', 0, 'Sixt Hauptbahnhof', null, 53.55, 10.0);
    endpoint.run(carId, 'to', 1, 'Sixt Airport', 'HAM', 53.63, 9.99);
    const router = hourlyRouter();
    const service = new RoadtripPlanService(
      new DatabaseService(db),
      { getUserSettings: () => ({}) } as never,
      { read: () => ({}) } as never,
      router as never,
      { listForTrip: () => [], tracksForTrip: () => [] } as never,
      { list: () => [] } as never,
    );

    const { calculated } = await service.calculate(trip.id, user.id);

    const card = calculated.days[0];
    expect(card.stops.map((s) => s.carrier?.role ?? s.name)).toEqual(['pickup', 'Hamburg', 'Lueneburg', 'Celle', 'return']);
    expect(card.stops[0].carrier).toMatchObject({ reservationId: carId, type: 'car', at: '08:00' });
    expect(card.stops[4].carrier).toMatchObject({ role: 'return', code: 'HAM', at: '18:00' });
    // One road, desk to desk: no ride, no seam, one routing run.
    expect(router.route).toHaveBeenCalledTimes(1);
    expect(card.legs.map((l) => l?.mode)).toEqual(['driving', 'driving', 'driving', 'driving']);
    expect(card.schedule.entries[0]).toMatchObject({ arrival: '08:00', departure: '08:00' });
    expect(card.distance).toBe(240_000);
    expect(calculated.totalStops).toBe(3);
  });
});

/**
 * The crossing from the report behind #2461: Amsterdam and Newcastle on one day, neither
 * with a clock, and a ferry from IJmuiden to the Port of Tyne. A day sailing here, so the
 * drive on from the far pier ends before midnight and the one-day trip stays one card.
 */
describe('a ferry across the day, and one on no day (#2461)', () => {
  function crossing() {
    const { user } = createUser(db);
    const trip = createTrip(db, user.id);
    const day = createDay(db, trip.id);
    for (const [name, lat, lng] of [
      ['Amsterdam', 52.3731, 4.8926],
      ['Newcastle', 54.9783, -1.6178],
    ] as const) {
      createDayAssignment(db, day.id, createPlace(db, trip.id, { name, lat, lng }).id);
    }
    const router = hourlyRouter();
    const plans = new RoadtripPlanService(
      new DatabaseService(db),
      { getUserSettings: () => ({}) } as never,
      { read: () => ({}) } as never,
      router as never,
      { listForTrip: () => [], tracksForTrip: () => [] } as never,
      { list: () => [] } as never,
    );
    return { user, trip, day, router, plans };
  }

  function withFerry(tripId: number, dayId: number | null, title: string, located = true): number {
    const id = Number(
      db
        .prepare(
          `INSERT INTO reservations (trip_id, title, type, day_id, end_day_id, reservation_time, reservation_end_time)
           VALUES (?, ?, 'ferry', ?, ?, '09:30', '15:00')`,
        )
        .run(tripId, title, dayId, dayId).lastInsertRowid,
    );
    if (located) {
      const endpoint = db.prepare(
        'INSERT INTO reservation_endpoints (reservation_id, role, sequence, name, code, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      endpoint.run(id, 'from', 0, 'IJmuiden', null, 52.4581, 4.5879);
      endpoint.run(id, 'to', 1, 'Port of Tyne', null, 54.9925, -1.4522);
    }
    return id;
  }

  it('drives to the pier and on from the far one, and never overland between the two shores', async () => {
    const { user, trip, day, router, plans } = crossing();
    withFerry(trip.id, day.id, 'IJmuiden to Newcastle');

    const { calculated, undatedRides } = await plans.calculate(trip.id, user.id);

    const card = calculated.days[0];
    // By the clock alone the ferry closed the day: Amsterdam to Newcastle overland, back
    // to IJmuiden, and only then the crossing.
    expect(card.stops.map((s) => s.carrier?.role ?? s.name)).toEqual(['Amsterdam', 'departure', 'arrival', 'Newcastle']);
    expect(card.legs.map((l) => l?.mode)).toEqual(['driving', 'ferry', 'driving']);
    // Two roads, one to each side of the crossing, and nothing between the two cities.
    expect(router.route).toHaveBeenCalledTimes(2);
    expect(card.distance).toBe(120_000);
    expect(undatedRides).toEqual([]);
  });

  it('names a located ride on no day, and the tool answers with the same list', async () => {
    const { user, trip, day, plans } = crossing();
    const undated = withFerry(trip.id, null, 'Ferry without a date');
    withFerry(trip.id, day.id, 'Ferry on the day');
    withFerry(trip.id, null, 'Ferry without terminals', false);
    db.prepare("INSERT INTO reservations (trip_id, title, type) VALUES (?, 'Dinner', 'restaurant')").run(trip.id);

    const plan = await plans.calculate(trip.id, user.id);

    expect(plan.undatedRides).toEqual([{ id: undated, type: 'ferry', title: 'Ferry without a date' }]);
    // It is on the drive nowhere, which is why it is named.
    expect(plan.context.carriers.map((c) => c.id)).not.toContain(undated);
    expect(plan.calculated.days.flatMap((d) => d.stops).some((s) => s.carrier?.reservationId === undated)).toBe(false);

    const tool = new RoadtripPlanningMcp(plans, {} as never, {} as never);
    const answer = await tool.calculate({ tripId: trip.id, includeGeometry: false }, { userId: user.id } as McpContext);
    const body = JSON.parse(answer.content[0].text as string);
    expect(body.undatedRides).toEqual(plan.undatedRides);
    expect(body.complete).toBe(true);
  });
});
