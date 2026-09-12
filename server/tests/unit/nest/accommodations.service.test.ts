/**
 * Unit tests for AccommodationsService. DAY-SVC-016..026, 029 and 035 moved here
 * 1:1 with the SQL they cover when accommodations became their own domain; the
 * case ids are unchanged so the diff reads as a move. Real in-memory SQLite.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

const { testDb, dbMock } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  return {
    testDb: db,
    dbMock: {
      db,
      closeDb: () => {},
      reinitialize: () => {},
      // Real enough for the stop-type stamp a stay write makes: it announces the
      // place it typed, and a null here would hide that the write happened at all.
      getPlaceWithTags: (id: number | string) => db.prepare('SELECT * FROM places WHERE id = ?').get(id) ?? null,
      canAccessTrip: (tripId: any, userId: number) =>
        db.prepare(`
          SELECT t.id, t.user_id FROM trips t
          LEFT JOIN trip_members m ON m.trip_id = t.id AND m.user_id = ?
          WHERE t.id = ? AND (t.user_id = ? OR m.user_id IS NOT NULL)
        `).get(userId, tripId, userId),
      isOwner: (tripId: any, userId: number) =>
        !!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
    },
  };
});

vi.mock('../../../src/db/database', () => dbMock);
const { broadcast } = vi.hoisted(() => ({ broadcast: vi.fn() }));
vi.mock('../../../src/websocket', () => ({ broadcast }));

import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';
import { resetTestDb } from '../../helpers/test-db';
import { createUser, createTrip, createDay, createPlace, createDayAccommodation, createDayAssignment, addTripMember } from '../../helpers/factories';
import { DatabaseService } from '../../../src/nest/database/database.service';
import { PermissionsService } from '../../../src/nest/permissions/permissions.service';
import { RealtimeService } from '../../../src/nest/realtime/realtime.service';
import { AccommodationsService } from '../../../src/nest/accommodations/accommodations.service';
import { makeAccommodationsService } from '../../helpers/accommodations-service';
import { AccommodationsModule } from '../../../src/nest/accommodations/accommodations.module';
import { AccommodationsController } from '../../../src/nest/accommodations/accommodations.controller';
import { expectRegisteredProvider, expectRegisteredController } from '../../helpers/module-providers';

// Named `svc` so the moved cases read exactly as they did on DaysService.
const svc = makeAccommodationsService(testDb);

beforeAll(() => {
  createTables(testDb);
  runMigrations(testDb);
});

beforeEach(() => {
  resetTestDb(testDb);
});

afterAll(() => {
  testDb.close();
});

describe('validateAccommodationRefs', () => {
  it('DAY-SVC-016 — returns no errors when all refs are valid', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const errors = svc.validateAccommodationRefs(trip.id, place.id, day.id, day.id);
    expect(errors).toHaveLength(0);
  });

  it('DAY-SVC-017 — returns error when place does not exist in trip', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const errors = svc.validateAccommodationRefs(trip.id, 99999, day.id, day.id);
    expect(errors.some((e: any) => e.field === 'place_id')).toBe(true);
  });

  it('DAY-SVC-018 — returns error when start_day_id is invalid', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const errors = svc.validateAccommodationRefs(trip.id, place.id, 99999, day.id);
    expect(errors.some((e: any) => e.field === 'start_day_id')).toBe(true);
  });

  it('ACC-003 — reports every bad ref, end_day_id included', () => {
    // The controller only surfaces errors[0], so an unchecked end_day_id would let a
    // stay point at a day from another trip and never be reported.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const errors = svc.validateAccommodationRefs(trip.id, 99999, 99998, 99997);
    expect(errors.map((e: any) => e.field)).toEqual(['place_id', 'start_day_id', 'end_day_id']);
  });

  it('ACC-004 — skips the refs the caller left undefined', () => {
    // The plugin update path (accommodations.rpc) passes only the fields it changes.
    // If an absent ref were validated, every partial update would 403 "Place not found".
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    expect(svc.validateAccommodationRefs(trip.id)).toHaveLength(0);
    expect(svc.validateAccommodationRefs(trip.id, undefined, undefined, undefined)).toHaveLength(0);
  });
});

describe('createAccommodation', () => {
  it('DAY-SVC-019 — creates accommodation and returns it with place info', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Grand Hotel' }) as any;

    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id,
      start_day_id: day.id,
      end_day_id: day.id,
      check_in: '15:00',
      check_out: '11:00',
    }) as any;

    expect(accom).toBeDefined();
    expect(accom.place_name).toBe('Grand Hotel');
  });

  it('DAY-SVC-020 — auto-creates a linked reservation', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'City Hotel' }) as any;

    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;

    const reservation = testDb.prepare('SELECT * FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    expect(reservation).toBeDefined();
    expect(reservation.type).toBe('hotel');
    expect(reservation.status).toBe('confirmed');
  });

  it('ACC-005 — titles the partner reservation "Hotel" when the stay has no place', () => {
    // day_accommodations.place_id is nullable (ON DELETE SET NULL) while
    // reservations.title is NOT NULL: without the fallback the reservation insert
    // fails and takes the whole transaction — and the stay — down with it.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;

    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: null as unknown as number, start_day_id: day.id, end_day_id: day.id,
    }) as any;

    expect(accom.place_name).toBeNull();
    const reservation = testDb.prepare('SELECT title FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    expect(reservation.title).toBe('Hotel');
  });
});

describe('getAccommodation', () => {
  it('DAY-SVC-021 — returns accommodation for valid id and trip', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const accom = createDayAccommodation(testDb, trip.id, place.id, day.id, day.id) as any;
    const found = svc.getAccommodation(accom.id, trip.id) as any;
    expect(found).toBeDefined();
    expect(found.id).toBe(accom.id);
  });

  it('DAY-SVC-022 — returns undefined for non-existent accommodation', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    expect(svc.getAccommodation(99999, trip.id)).toBeUndefined();
  });
});

describe('updateAccommodation', () => {
  it('DAY-SVC-023 — updates check-in and check-out times', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;

    const existing = svc.getAccommodation(accom.id, trip.id)!;
    const { accommodation: updated } = svc.updateAccommodation(accom.id, existing as any, { check_in: '16:00', check_out: '12:00' }) as any;
    expect(updated).toBeDefined();

    // Verify linked reservation metadata was synced
    const reservation = testDb.prepare('SELECT * FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    expect(reservation).toBeDefined();
    const meta = JSON.parse(reservation.metadata || '{}');
    expect(meta.check_in_time).toBe('16:00');
    expect(meta.check_out_time).toBe('12:00');
  });

  it('DAY-SVC-024 — preserves existing fields when not updated', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
      confirmation: 'ABC123',
    }) as any;

    const existing = svc.getAccommodation(accom.id, trip.id)!;
    svc.updateAccommodation(accom.id, existing as any, { check_in: '14:00' });

    const row = svc.getAccommodation(accom.id, trip.id) as any;
    expect(row.confirmation).toBe('ABC123');
  });

  it('ACC-006 — updates a stay that has no linked reservation', () => {
    // Stays imported before the auto-reservation existed have no partner row. The sync
    // block must be skipped for them, not throw on a missing reservation.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    // The factory writes the stay row directly, without the partner reservation.
    const accom = createDayAccommodation(testDb, trip.id, place.id, day.id, day.id) as any;

    const existing = svc.getAccommodation(accom.id, trip.id)!;
    const { accommodation: updated } = svc.updateAccommodation(accom.id, existing as any, { check_in: '15:00' }) as any;

    expect(updated.check_in).toBe('15:00');
    expect(testDb.prepare('SELECT COUNT(*) as n FROM reservations WHERE accommodation_id = ?').get(accom.id)).toMatchObject({ n: 0 });
  });

  it('ACC-007 — merges into the reservation metadata instead of replacing it', () => {
    // The stay is created with a check-in, so the reservation already carries metadata.
    // An update that only moves the check-out must parse and extend that object —
    // writing a fresh one would silently drop the check-in window.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id, check_in: '15:00',
    }) as any;

    const existing = svc.getAccommodation(accom.id, trip.id)!;
    svc.updateAccommodation(accom.id, existing as any, { check_in_end: '20:00', check_out: '11:00' });

    const reservation = testDb.prepare('SELECT metadata FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    expect(JSON.parse(reservation.metadata)).toEqual({
      check_in_time: '15:00', check_in_end_time: '20:00', check_out_time: '11:00',
    });
  });

  it('ACC-008 — leaves the reservation confirmation number alone when the stay has none', () => {
    // COALESCE(?, confirmation_number): a stay without a confirmation must not null out
    // a number that was typed on the reservation itself.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;
    testDb.prepare('UPDATE reservations SET confirmation_number = ? WHERE accommodation_id = ?').run('RES-9', accom.id);

    const existing = svc.getAccommodation(accom.id, trip.id)!;
    svc.updateAccommodation(accom.id, existing as any, { check_in: '15:00' });

    const reservation = testDb.prepare('SELECT confirmation_number FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    expect(reservation.confirmation_number).toBe('RES-9');
  });
});

describe('deleteAccommodation', () => {
  it('DAY-SVC-025 — deletes accommodation and its linked reservation', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;

    const reservation = testDb.prepare('SELECT id FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;

    const result = svc.deleteAccommodation(accom.id);
    expect(result.linkedReservationId).toBe(reservation.id);

    // Accommodation is gone
    expect(svc.getAccommodation(accom.id, trip.id)).toBeUndefined();

    // Reservation is gone
    const deletedRes = testDb.prepare('SELECT id FROM reservations WHERE id = ?').get(reservation.id);
    expect(deletedRes).toBeUndefined();
  });

  it('DAY-SVC-026 — returns null linkedReservationId when no reservation was linked', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const accom = createDayAccommodation(testDb, trip.id, place.id, day.id, day.id) as any;

    // Remove the auto-created reservation so there's no linked one
    testDb.prepare('DELETE FROM reservations WHERE accommodation_id = ?').run(accom.id);

    const result = svc.deleteAccommodation(accom.id);
    expect(result.linkedReservationId).toBeNull();
  });

  it('ACC-009 — also deletes the budget item that hangs off the linked reservation', () => {
    // The cost row references the reservation, not the stay, so the delete has to
    // cascade twice. Skipping the second hop strands a budget line whose reservation
    // is gone, and the costs view can no longer reach it to remove it.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;

    const reservation = testDb.prepare('SELECT id FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    const budgetItemId = testDb.prepare(
      'INSERT INTO budget_items (trip_id, name, category, total_price, reservation_id) VALUES (?, ?, ?, ?, ?)'
    ).run(trip.id, 'Hotel stay', 'Accommodation', 240, reservation.id).lastInsertRowid as number;

    const result = svc.deleteAccommodation(accom.id);

    expect(result).toEqual({
      linkedReservationId: reservation.id,
      deletedBudgetItemId: budgetItemId,
      linkedReservationIds: [reservation.id],
      deletedBudgetItemIds: [budgetItemId],
      mirror: { created: null, removed: [{ id: expect.any(Number), dayId: day.id }], stamped: null },
    });
    expect(testDb.prepare('SELECT id FROM budget_items WHERE id = ?').get(budgetItemId)).toBeUndefined();
  });

  it('ACC-010 — a second booking pointed at the same stay goes too, instead of being orphaned', () => {
    // reservations.accommodation_id carries no foreign key and no unique constraint,
    // and the booking form lets a hotel booking pick an existing stay. Deleting only
    // the first left the second behind, referencing a stay that no longer exists.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;

    const first = testDb.prepare('SELECT id FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    const second = testDb.prepare(
      'INSERT INTO reservations (trip_id, type, title, accommodation_id) VALUES (?, ?, ?, ?)'
    ).run(trip.id, 'hotel', 'Second booking', accom.id).lastInsertRowid as number;

    const result = svc.deleteAccommodation(accom.id);

    expect(result.linkedReservationIds).toEqual([first.id, second]);
    expect(result.linkedReservationId).toBe(first.id);
    expect(testDb.prepare('SELECT COUNT(*) as n FROM reservations WHERE accommodation_id = ?').get(accom.id)).toMatchObject({ n: 0 });
  });

  it('ACC-011 — updating the stay syncs the times onto every linked booking', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as any;
    testDb.prepare(
      'INSERT INTO reservations (trip_id, type, title, accommodation_id) VALUES (?, ?, ?, ?)'
    ).run(trip.id, 'hotel', 'Second booking', accom.id);

    const existing = testDb.prepare('SELECT * FROM day_accommodations WHERE id = ?').get(accom.id) as any;
    svc.updateAccommodation(accom.id, existing, { check_in: '15:00', check_out: '11:00' });

    const rows = testDb.prepare('SELECT metadata FROM reservations WHERE accommodation_id = ?').all(accom.id) as Array<{ metadata: string | null }>;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(JSON.parse(row.metadata || '{}')).toMatchObject({ check_in_time: '15:00', check_out_time: '11:00' });
    }
  });
});

describe('listAccommodations', () => {
  it('DAY-SVC-029 — listAccommodations returns the hydrated stays', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Ryokan' });
    createDayAccommodation(testDb, trip.id, place.id, day.id, day.id);
    const rows = svc.listAccommodations(trip.id) as { place_name: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].place_name).toBe('Ryokan');
  });
});

describe('quirk fixes', () => {
  it('DAY-SVC-035 — deleteAccommodation is atomic: a failed stay delete keeps the linked reservation', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel' });
    const { accommodation: accom } = svc.createAccommodation(trip.id, {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id,
    }) as { accommodation: { id: number } };
    testDb.exec("CREATE TRIGGER boom BEFORE DELETE ON day_accommodations BEGIN SELECT RAISE(ABORT, 'boom'); END");
    try {
      expect(() => svc.deleteAccommodation(accom.id)).toThrow();
      // The earlier reservation delete inside the transaction rolled back.
      expect(testDb.prepare('SELECT COUNT(*) as n FROM reservations WHERE accommodation_id = ?').get(accom.id)).toMatchObject({ n: 1 });
    } finally {
      testDb.exec('DROP TRIGGER boom');
    }
  });
});

describe('route-facing delegators', () => {
  // list/validateRefs/get/create/update/remove are what the controller, the plugin RPC
  // and trip-read-model call; the MCP tools call the long names. Both sets have to land
  // on the same SQL, and the short ones get raw route params — strings where the long
  // ones get numbers.

  it('ACC-010 — list() returns what listAccommodations() returns, for a string and a number trip id', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Pension Alpen' }) as any;
    createDayAccommodation(testDb, trip.id, place.id, day.id, day.id);

    expect(svc.list(String(trip.id))).toEqual(svc.listAccommodations(trip.id));
    expect((svc.list(trip.id) as any[])[0].place_name).toBe('Pension Alpen');
  });

  it('ACC-011 — validateRefs() returns the same errors validateAccommodationRefs() does', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;

    expect(svc.validateRefs(trip.id, place.id, day.id, day.id)).toHaveLength(0);
    // The controller 404s with errors[0].message, so the shape matters, not just the count.
    expect(svc.validateRefs(trip.id, 99999, day.id, day.id)).toEqual([{ field: 'place_id', message: 'Place not found' }]);
  });

  it('ACC-012 — create() writes the stay, get() reads it back trip-scoped', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const otherTrip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;

    // Both ids arrive from the route as strings.
    const { accommodation: created } = svc.create(String(trip.id), {
      place_id: place.id, start_day_id: day.id, end_day_id: day.id, confirmation: 'XY-1',
    }) as any;

    expect(svc.get(String(created.id), String(trip.id))).toMatchObject({ id: created.id, confirmation: 'XY-1' });
    // Trip-scoped: a stay must not be readable through another trip's URL.
    expect(svc.get(created.id, otherTrip.id)).toBeUndefined();
  });

  it('ACC-013 — update() syncs the partner reservation even when the id is a string', () => {
    // updateAccommodation looks the reservation up with Number(id); if that coercion
    // regresses, the REST path silently stops syncing check-in times.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.create(trip.id, { place_id: place.id, start_day_id: day.id, end_day_id: day.id }) as any;

    const existing = svc.get(accom.id, trip.id)!;
    const { accommodation: updated } = svc.update(String(accom.id), existing as any, { check_in: '16:00', notes: 'late arrival' }) as any;

    expect(updated).toMatchObject({ check_in: '16:00', notes: 'late arrival' });
    const reservation = testDb.prepare('SELECT metadata FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;
    expect(JSON.parse(reservation.metadata).check_in_time).toBe('16:00');
  });

  it('ACC-014 — remove() reports the partner reservation it took with it', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id) as any;
    const place = createPlace(testDb, trip.id, { name: 'Hotel' }) as any;
    const { accommodation: accom } = svc.create(trip.id, { place_id: place.id, start_day_id: day.id, end_day_id: day.id }) as any;
    const reservation = testDb.prepare('SELECT id FROM reservations WHERE accommodation_id = ?').get(accom.id) as any;

    // The controller broadcasts reservation:deleted off this return value.
    expect(svc.remove(String(accom.id))).toEqual({
      linkedReservationId: reservation.id,
      deletedBudgetItemId: null,
      linkedReservationIds: [reservation.id],
      deletedBudgetItemIds: [],
      mirror: { created: null, removed: [{ id: expect.any(Number), dayId: day.id }], stamped: null },
    });
    expect(svc.get(accom.id, trip.id)).toBeUndefined();
  });
});

describe('trip access and edit permission', () => {
  it('ACC-015 — verifyTripAccess resolves the trip from a string id and from a number', () => {
    // The REST path hands over the raw :tripId param, the MCP tools the parsed number.
    // Without the Number() coercion one of the two callers stops finding its trip.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);

    expect(svc.verifyTripAccess(String(trip.id), user.id)).toMatchObject({ id: trip.id, user_id: user.id });
    expect(svc.verifyTripAccess(trip.id, user.id)).toMatchObject({ id: trip.id, user_id: user.id });
  });

  it('ACC-016 — verifyTripAccess returns nothing for a user who is neither owner nor member', () => {
    const { user: owner } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);

    expect(svc.verifyTripAccess(trip.id, stranger.id)).toBeUndefined();
  });

  it('ACC-017 — canEdit lets the owner through on the default day_edit level', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const access = svc.verifyTripAccess(trip.id, user.id)!;

    expect(svc.canEdit(access, user as any)).toBe(true);
  });

  it('ACC-018 — canEdit lets a member through: it derives isMember from the trip owner id', () => {
    // day_edit defaults to trip_member. canEdit passes `trip.user_id !== user.id` as the
    // isMember flag, so inverting that comparison would lock every invited traveller out
    // of the day plan while the owner still edits fine.
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const access = svc.verifyTripAccess(trip.id, member.id)!;

    expect(svc.canEdit(access, member as any)).toBe(true);
  });

  it('ACC-019 — canEdit denies a member once day_edit is raised to trip_owner', () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const permissions = new PermissionsService(new DatabaseService(testDb));

    try {
      permissions.savePermissions({ day_edit: 'trip_owner' });
      expect(svc.canEdit(svc.verifyTripAccess(trip.id, member.id)!, member as any)).toBe(false);
      // The owner keeps the right, otherwise the setting would lock out the whole trip.
      expect(svc.canEdit(svc.verifyTripAccess(trip.id, owner.id)!, owner as any)).toBe(true);
    } finally {
      // The permission cache is module-scoped and outlives resetTestDb — drop the row and
      // the cache together, or every later case in this file inherits the raised level.
      testDb.prepare("DELETE FROM app_settings WHERE key = 'perm_day_edit'").run();
      permissions.invalidatePermissionsCache();
    }
  });

  it('ACC-020 — broadcast forwards the socket id so the originating client is not echoed', () => {
    // The X-Socket-Id contract: the facade must pass the id straight through as the
    // fourth argument. Dropping it makes the sender apply its own change twice.
    broadcast.mockClear();

    svc.broadcast('5', 'accommodation:deleted', { accommodationId: 9 }, 'sock-1');
    expect(broadcast).toHaveBeenCalledWith('5', 'accommodation:deleted', { accommodationId: 9 }, 'sock-1');

    svc.broadcast('5', 'accommodation:updated', { accommodation: { id: 9 } }, undefined);
    expect(broadcast).toHaveBeenLastCalledWith('5', 'accommodation:updated', { accommodation: { id: 9 } }, undefined);
  });
});

/**
 * Booking a night also puts its place on the check-in day, because that stop is what
 * the road trip routes and the map draws. Reported from Discord: a hotel entered in
 * the day planner never reached the road-trip view, so the same place had to be
 * entered a second time as an ordinary stop.
 */
describe('the day stop a booking implies', () => {
  const stopsOn = (dayId: number) =>
    testDb.prepare('SELECT id, place_id, order_index, accommodation_id FROM day_assignments WHERE day_id = ? ORDER BY order_index').all(dayId) as
      { id: number; place_id: number; order_index: number; accommodation_id: number | null }[];

  const book = (tripId: number, placeId: number | null, startDayId: number, endDayId: number) =>
    svc.createAccommodation(tripId, { place_id: placeId as number, start_day_id: startDayId, end_day_id: endDayId }) as any;

  it('ACC-021 the booked night puts its place on the check-in day and marks the stop as its own', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });

    const { accommodation, mirror } = book(trip.id, place.id, day.id, day.id);

    const stops = stopsOn(day.id);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ place_id: place.id, accommodation_id: accommodation.id });
    expect(mirror.created).toMatchObject({ id: stops[0].id, day_id: day.id, place_id: place.id });
  });

  it('ACC-022 the stop lands at the end of the day, where you arrive at a hotel', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const museum = createPlace(testDb, trip.id, { name: 'Pergamon' });
    const hotel = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    createDayAssignment(testDb, day.id, museum.id);

    book(trip.id, hotel.id, day.id, day.id);

    expect(stopsOn(day.id).map(a => a.place_id)).toEqual([museum.id, hotel.id]);
  });

  it('ACC-023 the place is typed as lodging, so the rail draws it as a service stop', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });

    const { mirror } = book(trip.id, place.id, day.id, day.id);

    expect(testDb.prepare('SELECT stop_type FROM places WHERE id = ?').get(place.id)).toMatchObject({ stop_type: 'hotel' });
    // Announced, or the places list keeps the stale null until a reload.
    expect(mirror.stamped).toMatchObject({ id: place.id, stop_type: 'hotel' });
    // And the stop carries it, so the rail does not number it.
    expect(mirror.created.place.stop_type).toBe('hotel');
  });

  it('ACC-024 a stop type the traveller picked is never overwritten', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Camping Isar' });
    testDb.prepare("UPDATE places SET stop_type = 'campsite' WHERE id = ?").run(place.id);

    const { mirror } = book(trip.id, place.id, day.id, day.id);

    expect(testDb.prepare('SELECT stop_type FROM places WHERE id = ?').get(place.id)).toMatchObject({ stop_type: 'campsite' });
    expect(mirror.stamped).toBeNull();
  });

  it('ACC-025 a place already planned for that day gets no second stop, and the booking claims neither', () => {
    // This is the road-trip flow: it assigns the place to the day and only then books
    // the night. A second stop would draw the hotel twice, and claiming the existing
    // one would let cancelling the booking delete a stop the traveller placed.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    const own = createDayAssignment(testDb, day.id, place.id);

    const { mirror } = book(trip.id, place.id, day.id, day.id);

    expect(stopsOn(day.id)).toEqual([expect.objectContaining({ id: own.id, accommodation_id: null })]);
    expect(mirror.created).toBeNull();
  });

  it('ACC-026 only the check-in day, not every night of a long stay', () => {
    // You drive there once. The later nights ride on the stay row, which is where the
    // rail reads check-out from.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const arrive = createDay(testDb, trip.id);
    const middle = createDay(testDb, trip.id);
    const leave = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });

    book(trip.id, place.id, arrive.id, leave.id);

    expect(stopsOn(arrive.id)).toHaveLength(1);
    expect(stopsOn(middle.id)).toHaveLength(0);
    expect(stopsOn(leave.id)).toHaveLength(0);
  });

  it('ACC-027 a stay with no place writes no stop instead of throwing', () => {
    // day_accommodations.place_id is nullable (ON DELETE SET NULL) and the booking form
    // writes stays that never had one.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);

    const { mirror } = book(trip.id, null, day.id, day.id);

    expect(mirror).toEqual({ created: null, removed: [], stamped: null });
    expect(stopsOn(day.id)).toHaveLength(0);
  });

  it('ACC-028 moving the booking to another day moves its stop with it', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day1 = createDay(testDb, trip.id);
    const day2 = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    const { accommodation } = book(trip.id, place.id, day1.id, day1.id);
    const before = stopsOn(day1.id)[0];

    const existing = svc.getAccommodation(accommodation.id, trip.id)!;
    const { mirror } = svc.updateAccommodation(accommodation.id, existing, { start_day_id: day2.id, end_day_id: day2.id }) as any;

    expect(stopsOn(day1.id)).toHaveLength(0);
    expect(stopsOn(day2.id)).toEqual([expect.objectContaining({ place_id: place.id, accommodation_id: accommodation.id })]);
    expect(mirror.removed).toEqual([{ id: before.id, dayId: day1.id }]);
    expect(mirror.created).toMatchObject({ day_id: day2.id });
  });

  it('ACC-029 editing an unrelated field leaves the stop exactly where it is', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    const { accommodation } = book(trip.id, place.id, day.id, day.id);
    const before = stopsOn(day.id);

    const existing = svc.getAccommodation(accommodation.id, trip.id)!;
    const { mirror } = svc.updateAccommodation(accommodation.id, existing, { check_in: '16:00' }) as any;

    expect(stopsOn(day.id)).toEqual(before);
    expect(mirror).toEqual({ created: null, removed: [], stamped: null });
  });

  it('ACC-030 a stay booked before any of this existed picks up its stop on the next save', () => {
    // The deliberate alternative to rewriting everybody finished trips in a migration:
    // the booking reaches the route the moment somebody opens it and saves.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    const old = createDayAccommodation(testDb, trip.id, place.id, day.id, day.id) as any;

    const existing = svc.getAccommodation(old.id, trip.id)!;
    svc.updateAccommodation(old.id, existing, { check_in: '15:00' });

    expect(stopsOn(day.id)).toEqual([expect.objectContaining({ place_id: place.id, accommodation_id: old.id })]);
  });

  it('ACC-031 cancelling a booking takes back its own stop and leaves the other one', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const hotel = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    const museum = createPlace(testDb, trip.id, { name: 'Pergamon' });
    const own = createDayAssignment(testDb, day.id, museum.id);
    const { accommodation } = book(trip.id, hotel.id, day.id, day.id);
    const mirrored = stopsOn(day.id).find(a => a.place_id === hotel.id)!;

    const { mirror } = svc.deleteAccommodation(accommodation.id);

    expect(stopsOn(day.id)).toEqual([expect.objectContaining({ id: own.id })]);
    expect(mirror.removed).toEqual([{ id: mirrored.id, dayId: day.id }]);
  });

  it('ACC-032 cancelling a night booked in the road trip keeps the stop standing', () => {
    // The rail turns a night back into a pause by deleting the stay alone; the stop is
    // the thing being edited there and has to survive.
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id);
    const place = createPlace(testDb, trip.id, { name: 'Hotel Adlon' });
    const own = createDayAssignment(testDb, day.id, place.id);
    const { accommodation } = book(trip.id, place.id, day.id, day.id);

    const { mirror } = svc.deleteAccommodation(accommodation.id);

    expect(stopsOn(day.id)).toEqual([expect.objectContaining({ id: own.id })]);
    expect(mirror.removed).toEqual([]);
  });

  it('ACC-033 announceMirror sends the removal before the arrival', () => {
    // Order matters on a move: the day plan would briefly hold the place twice if the
    // arrival went first.
    const sent: string[] = [];
    svc.announceMirror(5, {
      created: { id: 78, day_id: 11 } as never,
      removed: [{ id: 77, dayId: 10 }],
      stamped: { id: 3 } as never,
    }, event => { sent.push(event); });
    expect(sent).toEqual(['assignment:deleted', 'assignment:created', 'place:updated']);
  });
});

describe('AccommodationsService wiring', () => {
  it('ACC-001: the module carries the controller, the service and the RPC surface', () => {
    expectRegisteredController(AccommodationsModule, AccommodationsController);
    expectRegisteredProvider(AccommodationsModule, AccommodationsService);
    const exports = Reflect.getMetadata('exports', AccommodationsModule) as unknown[];
    expect(Array.isArray(exports)).toBe(true);
    expect(exports).toEqual(expect.arrayContaining([AccommodationsService]));
  });

  it('ACC-002: it does not import the days or reservations modules', () => {
    const imports = (Reflect.getMetadata('imports', AccommodationsModule) as { name?: string }[]) ?? [];
    expect(Array.isArray(imports)).toBe(true);
    const names = imports.map((m) => m?.name);
    expect(names).not.toContain('DaysModule');
    expect(names).not.toContain('ReservationsModule');
  });
});
