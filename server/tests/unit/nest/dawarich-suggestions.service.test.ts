/**
 * Unit tests for DawarichSuggestionsService — DAWARICH-SUG-001..030.
 *
 * This is the only service in the Dawarich domain that writes into TREK proper,
 * and every write it makes crosses an ownership line: a suggestion belongs to
 * one user, the trip it lands on belongs to a roster, the wish it ticks belongs
 * to the caller alone. So the DB is real in-memory SQLite — the scoping lives in
 * the SQL and a stub would assert nothing about it — while the four collaborators
 * that would reach further (Atlas, Places, Assignments, Journey) are stubs, plus
 * DawarichService and DawarichClient so no case can touch the network or a
 * user's stored credentials.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

// ── DB setup (real in-memory SQLite — same pattern as the other service tests) ──

const { testDb, dbMock } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  const mock = {
    db,
    closeDb: () => {},
    reinitialize: () => {},
    getPlaceWithTags: () => null,
    canAccessTrip: (tripId: unknown, userId: number) =>
      db.prepare(`
        SELECT t.id, t.user_id FROM trips t
        LEFT JOIN trip_members m ON m.trip_id = t.id AND m.user_id = ?
        WHERE t.id = ? AND (t.user_id = ? OR m.user_id IS NOT NULL)
      `).get(userId, tripId, userId),
    isOwner: (tripId: unknown, userId: number) =>
      !!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
  };
  return { testDb: db, dbMock: mock };
});

vi.mock('../../../src/db/database', () => dbMock);
vi.mock('../../../src/config', () => ({
  JWT_SECRET: 'test-secret',
  ENCRYPTION_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2',
  updateJwtSecret: () => {},
}));
vi.mock('../../../src/websocket', () => ({ broadcast: vi.fn() }));

import type { DawarichConnection } from '@trek/shared';
import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';
import { resetTestDb } from '../../helpers/test-db';
import { createUser, createTrip, createDay, addTripMember } from '../../helpers/factories';
import { DatabaseService } from '../../../src/nest/database/database.service';
import {
  AcceptError,
  DawarichSuggestionsService,
} from '../../../src/nest/integrations/dawarich-suggestions.service';
import type { DawarichService } from '../../../src/nest/integrations/dawarich.service';
import type { DawarichClient } from '../../../src/nest/integrations/dawarich.client';
import type { AtlasService } from '../../../src/nest/atlas/atlas.service';
import type { PlacesService } from '../../../src/nest/places/places.service';
import type { AssignmentsService } from '../../../src/nest/assignments/assignments.service';
import type { PermissionsService } from '../../../src/nest/permissions/permissions.service';
import type { JourneyDomainService } from '../../../src/nest/journey/journey-domain.service';

// ── Collaborator stubs ───────────────────────────────────────────────────────
//
// `getCredentials` hands back a fixed pair rather than reading
// dawarich_connections: the encrypted-at-rest round trip is DawarichService's
// own business, and a case that needed it would be testing apiKeyCrypto. The
// client is a stub with no implementation of its own, which doubles as the
// assertion that nothing here reaches the network — an unstubbed call would
// return undefined and fail loudly rather than dial out.

const CREDS = { baseUrl: 'https://dawarich.example.com', apiKey: 'test-key', allowInsecureTls: false };

const CONNECTION: DawarichConnection = {
  url: CREDS.baseUrl,
  apiKeyMasked: '********',
  allowInsecureTls: false,
  syncEnabled: true,
  connected: true,
  lastSyncAt: '2026-09-06T04:15:00Z',
  lastSyncState: 'ok',
  lastSyncError: null,
  capabilities: null,
};

const dawarichStub = {
  getConnection: vi.fn(),
  getCredentials: vi.fn(),
};
const clientStub = {
  findVisitsNear: vi.fn(),
  listVisitedCities: vi.fn(),
};
const atlasStub = { markCountry: vi.fn() };
// `broadcast` and `onCreated` are stubbed because an acceptance is a normal
// place write and has to behave like one: everyone on the trip is told, and a
// live journey mirrors it. Both are asserted rather than merely tolerated.
const placesStub = { create: vi.fn(), broadcast: vi.fn(), onCreated: vi.fn() };
const assignmentsStub = { dayExists: vi.fn(), createAssignment: vi.fn(), broadcast: vi.fn() };
// The instance's permission matrix, stubbed so a case can narrow place_edit or
// day_edit to the owner the way an admin would and watch a member be refused.
const permissionsStub = { checkPermission: vi.fn() };
const journeyStub = { canEdit: vi.fn(), createEntry: vi.fn() };

const dbs = new DatabaseService(testDb);
const svc = new DawarichSuggestionsService(
  dbs,
  dawarichStub as unknown as DawarichService,
  clientStub as unknown as DawarichClient,
  atlasStub as unknown as AtlasService,
  placesStub as unknown as PlacesService,
  assignmentsStub as unknown as AssignmentsService,
  permissionsStub as unknown as PermissionsService,
  journeyStub as unknown as JourneyDomainService,
);

const CREATED_ENTRY_ID = 7702;

/**
 * The places stub writes a real row rather than inventing an id:
 * `accepted_place_id` is a foreign key onto places, so a made-up number makes
 * the acceptance fail on the constraint instead of on anything a case is about.
 */
function insertPlaceRow(tripId: string, body: { name?: string; lat?: number; lng?: number }): { id: number } {
  const category = testDb.prepare('SELECT id FROM categories LIMIT 1').get() as { id: number } | undefined;
  const result = testDb
    .prepare('INSERT INTO places (trip_id, name, lat, lng, category_id) VALUES (?, ?, ?, ?, ?)')
    .run(Number(tripId), body.name ?? 'Imported stay', body.lat ?? null, body.lng ?? null, category?.id ?? null);
  return { id: Number(result.lastInsertRowid) };
}

function armStubs(): void {
  dawarichStub.getConnection.mockReset().mockReturnValue({ ...CONNECTION });
  dawarichStub.getCredentials.mockReset().mockReturnValue({ ...CREDS });
  clientStub.findVisitsNear.mockReset();
  clientStub.listVisitedCities.mockReset();
  // Answers true — it added the country — unless a case says otherwise.
  atlasStub.markCountry.mockReset().mockReturnValue(true);
  placesStub.create
    .mockReset()
    .mockImplementation((tripId: string, body: { name?: string; lat?: number; lng?: number }) =>
      insertPlaceRow(tripId, body),
    );
  // Answered out of the same DB the cases seed: day ownership is the point of
  // several of them, and a stub hardcoded to true would prove nothing about
  // which trip the day was looked up against.
  assignmentsStub.dayExists
    .mockReset()
    .mockImplementation(
      (dayId: unknown, tripId: unknown) =>
        !!testDb.prepare('SELECT id FROM days WHERE id = ? AND trip_id = ?').get(dayId, tripId),
    );
  placesStub.broadcast.mockReset();
  placesStub.onCreated.mockReset();
  assignmentsStub.createAssignment.mockReset();
  assignmentsStub.broadcast.mockReset();
  permissionsStub.checkPermission.mockReset().mockReturnValue(true);
  journeyStub.canEdit.mockReset().mockReturnValue(true);
  journeyStub.createEntry.mockReset().mockReturnValue({ id: CREATED_ENTRY_ID });
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

interface SuggestionSeed {
  userId: number;
  tripId?: number | null;
  name?: string;
  lat?: number | null;
  lng?: number | null;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  localDate?: string;
  state?: string;
  matchedBucketListItemId?: number | null;
  sourceHash?: string;
}

let _visitSeq = 0;

function seedSuggestion(seed: SuggestionSeed): number {
  _visitSeq++;
  const result = testDb
    .prepare(
      `INSERT INTO dawarich_visit_suggestions
         (user_id, source_visit_id, trip_id, name, lat, lng, started_at, ended_at,
          duration_minutes, local_date, state, matched_bucket_list_item_id, source_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      seed.userId,
      `visit-${_visitSeq}`,
      seed.tripId ?? null,
      seed.name ?? 'Cafe Central',
      seed.lat === undefined ? 48.2092 : seed.lat,
      seed.lng === undefined ? 16.3658 : seed.lng,
      seed.startedAt ?? '2026-09-01T09:30:00Z',
      seed.endedAt ?? '2026-09-01T11:45:00Z',
      seed.durationMinutes ?? 135,
      seed.localDate ?? '2026-09-01',
      seed.state ?? 'new',
      seed.matchedBucketListItemId ?? null,
      seed.sourceHash ?? `hash-${_visitSeq}`,
    );
  return Number(result.lastInsertRowid);
}

interface SuggestionRow {
  id: number;
  state: string;
  target: string | null;
  accepted_place_id: number | null;
  accepted_journal_entry_id: number | null;
  accepted_bucket_list_item_id: number | null;
  source_hash: string;
  accepted_hash: string | null;
}

function rowOf(id: number): SuggestionRow {
  return testDb.prepare('SELECT * FROM dawarich_visit_suggestions WHERE id = ?').get(id) as SuggestionRow;
}

interface BucketRow {
  id: number;
  name: string;
  visited_at: string | null;
  visited_source: string | null;
}

function seedBucketItem(
  userId: number,
  overrides: Partial<{
    name: string;
    lat: number | null;
    lng: number | null;
    visitedAt: string | null;
    visitedSource: string | null;
  }> = {},
): number {
  const result = testDb
    .prepare(
      'INSERT INTO bucket_list (user_id, name, lat, lng, visited_at, visited_source) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      userId,
      overrides.name ?? 'Zell am See',
      overrides.lat === undefined ? 47.3232 : overrides.lat,
      overrides.lng === undefined ? 12.7981 : overrides.lng,
      overrides.visitedAt ?? null,
      overrides.visitedSource ?? null,
    );
  return Number(result.lastInsertRowid);
}

function bucketOf(id: number): BucketRow {
  return testDb.prepare('SELECT * FROM bucket_list WHERE id = ?').get(id) as BucketRow;
}

/**
 * The refusal itself, not just that one happened: every case here cares about
 * the status the controller maps and the code the MCP tool renders, and
 * `toThrow(AcceptError)` alone would pass on the wrong refusal.
 */
function refusalFrom(fn: () => unknown): AcceptError {
  try {
    fn();
  } catch (err) {
    if (err instanceof AcceptError) return err;
    throw err;
  }
  throw new Error('expected the call to throw an AcceptError, but it returned');
}

async function asyncRefusalFrom(fn: () => Promise<unknown>): Promise<AcceptError> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof AcceptError) return err;
    throw err;
  }
  throw new Error('expected the call to reject with an AcceptError, but it resolved');
}

beforeAll(() => {
  createTables(testDb);
  runMigrations(testDb);
});

beforeEach(() => {
  resetTestDb(testDb);
  // dawarich_visit_suggestions is not in the shared helper's reset list, so it
  // is cleared here rather than by widening a list every other suite shares.
  testDb.exec('DELETE FROM dawarich_visit_suggestions');
  armStubs();
});

afterAll(() => {
  testDb.close();
});

// ── list / getOne ────────────────────────────────────────────────────────────

describe('DawarichSuggestionsService — the review list', () => {
  it("DAWARICH-SUG-001: list() is scoped in SQL — a stranger's suggestion never appears", () => {
    const { user: mine } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const mineId = seedSuggestion({ userId: mine.id, name: 'Volksgarten' });
    const strangerId = seedSuggestion({ userId: stranger.id, name: 'Their Kitchen' });

    const list = svc.list(mine.id, {});

    expect(list.suggestions.map((s) => s.id)).toEqual([mineId]);
    expect(list.suggestions.map((s) => s.name)).not.toContain('Their Kitchen');
    // Asserted in both directions, so an id that happens to line up cannot carry it.
    expect(svc.list(stranger.id, {}).suggestions.map((s) => s.id)).toEqual([strangerId]);
  });

  it('DAWARICH-SUG-002: list() narrows by trip and by state, both still inside the user scope', () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const otherTrip = createTrip(testDb, user.id);
    const strangerTrip = createTrip(testDb, stranger.id);

    const onTrip = seedSuggestion({ userId: user.id, tripId: trip.id, startedAt: '2026-09-03T08:00:00Z' });
    const dismissed = seedSuggestion({ userId: user.id, tripId: trip.id, state: 'dismissed' });
    seedSuggestion({ userId: user.id, tripId: otherTrip.id });
    seedSuggestion({ userId: stranger.id, tripId: strangerTrip.id });

    const byTrip = svc
      .list(user.id, { tripId: trip.id })
      .suggestions.map((s) => s.id)
      .sort((a, b) => a - b);
    expect(byTrip).toEqual([onTrip, dismissed].sort((a, b) => a - b));

    expect(svc.list(user.id, { tripId: trip.id, state: 'dismissed' }).suggestions.map((s) => s.id)).toEqual([
      dismissed,
    ]);
    // Another user's trip id is not a way in: the user clause still applies.
    expect(svc.list(user.id, { tripId: strangerTrip.id }).suggestions).toEqual([]);
  });

  it('DAWARICH-SUG-003: list() carries the connection state so a panel needs no second request', () => {
    const { user } = createUser(testDb);
    seedSuggestion({ userId: user.id });

    const list = svc.list(user.id, {});

    expect(dawarichStub.getConnection).toHaveBeenCalledWith(user.id);
    expect(list.connected).toBe(true);
    expect(list.lastSyncAt).toBe('2026-09-06T04:15:00Z');
    expect(list.lastSyncState).toBe('ok');
    expect(list.lastSyncError).toBeNull();
  });

  it('DAWARICH-SUG-004: getOne() answers null for a suggestion that belongs to somebody else', () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const theirs = seedSuggestion({ userId: stranger.id, name: 'Their Kitchen' });

    expect(svc.getOne(user.id, theirs)).toBeNull();
    expect(svc.getOne(stranger.id, theirs)?.name).toBe('Their Kitchen');
  });
});

// ── accept: place ────────────────────────────────────────────────────────────

describe('DawarichSuggestionsService — accepting into a trip', () => {
  it('DAWARICH-SUG-005: a trip the caller cannot see is a 404, and nothing is created', () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const strangerTrip = createTrip(testDb, stranger.id);
    const id = seedSuggestion({ userId: user.id });

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'place', tripId: strangerTrip.id }));

    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
    expect(placesStub.create).not.toHaveBeenCalled();
    expect(rowOf(id).state).toBe('new');
  });

  it('DAWARICH-SUG-006: a day from another trip is a 400 — trip access is not day access', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const otherTrip = createTrip(testDb, user.id);
    const foreignDay = createDay(testDb, otherTrip.id, { date: '2026-09-01' });
    const id = seedSuggestion({ userId: user.id });

    const err = refusalFrom(() =>
      svc.accept(user.id, id, { target: 'place', tripId: trip.id, dayId: foreignDay.id }),
    );

    expect(err.status).toBe(400);
    expect(err.code).toBe('day_not_on_trip');
    // The day was checked against the trip it is being attached to, not on its own.
    expect(assignmentsStub.dayExists).toHaveBeenCalledWith(foreignDay.id, trip.id);
    expect(placesStub.create).not.toHaveBeenCalled();
    expect(assignmentsStub.createAssignment).not.toHaveBeenCalled();
    expect(rowOf(id).state).toBe('new');
  });

  it('DAWARICH-SUG-007: a stay on a trip the caller is a member of becomes a place pinned to the day', () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const day = createDay(testDb, trip.id, { date: '2026-09-01' });
    const id = seedSuggestion({ userId: member.id, tripId: trip.id, name: 'Cafe Central' });

    const result = svc.accept(member.id, id, {
      target: 'place',
      tripId: trip.id,
      dayId: day.id,
      notes: 'long lunch',
    });

    expect(placesStub.create).toHaveBeenCalledWith(
      String(trip.id),
      expect.objectContaining({
        name: 'Cafe Central',
        lat: 48.2092,
        lng: 16.3658,
        notes: 'long lunch',
        place_time: '09:30',
        end_time: '11:45',
        duration_minutes: 135,
      }),
    );
    const placeId = result.createdPlaceId;
    expect(placeId).not.toBeNull();
    expect(assignmentsStub.createAssignment).toHaveBeenCalledWith(day.id, placeId, null);
    expect(result.createdJournalEntryId).toBeNull();
    expect(result.suggestion.state).toBe('accepted');

    const row = rowOf(id);
    expect(row.target).toBe('place');
    expect(row.accepted_place_id).toBe(placeId);
    // The hash is frozen at acceptance, which is what makes "changed since" answerable.
    expect(row.accepted_hash).toBe(row.source_hash);
    expect(result.suggestion.sourceChanged).toBe(false);
  });

  it('DAWARICH-SUG-008: a stay with no trip anywhere is a 400 rather than a place nobody can see', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id, tripId: null });

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'place' }));

    expect(err.status).toBe(400);
    expect(err.code).toBe('trip_required');
    expect(placesStub.create).not.toHaveBeenCalled();
  });

  it("DAWARICH-SUG-009: accepting a stranger's suggestion is a 404 before any target is looked at", () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const theirs = seedSuggestion({ userId: stranger.id });

    const err = refusalFrom(() => svc.accept(user.id, theirs, { target: 'place', tripId: trip.id }));

    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
    expect(placesStub.create).not.toHaveBeenCalled();
  });
});

// ── accept: journal ──────────────────────────────────────────────────────────

describe('DawarichSuggestionsService — accepting into a journey', () => {
  it('DAWARICH-SUG-010: a journey the caller may not edit refuses before createEntry is reached', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id });
    journeyStub.canEdit.mockReturnValue(false);

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'journal', journalId: 4242 }));

    expect(journeyStub.canEdit).toHaveBeenCalledWith(4242, user.id);
    expect(err.status).toBe(404);
    expect(err.code).toBe('journal_forbidden');
    expect(journeyStub.createEntry).not.toHaveBeenCalled();
    expect(rowOf(id).state).toBe('new');
  });

  it('DAWARICH-SUG-011: a permitted journey gets a dated entry, with the socket id passed through', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id, name: 'Cafe Central', localDate: '2026-09-01' });

    const result = svc.accept(user.id, id, { target: 'journal', journalId: 88 }, 'socket-7');

    expect(journeyStub.createEntry).toHaveBeenCalledWith(
      88,
      user.id,
      expect.objectContaining({
        type: 'entry',
        title: 'Cafe Central',
        entry_date: '2026-09-01',
        entry_time: '09:30',
        location_name: 'Cafe Central',
        location_lat: 48.2092,
        location_lng: 16.3658,
      }),
      'socket-7',
    );
    expect(result.createdJournalEntryId).toBe(CREATED_ENTRY_ID);
    expect(result.createdPlaceId).toBeNull();

    const row = rowOf(id);
    expect(row.state).toBe('accepted');
    expect(row.target).toBe('journal');
    expect(row.accepted_journal_entry_id).toBe(CREATED_ENTRY_ID);
  });

  it('DAWARICH-SUG-012: a journey id missing from the body is a 400, not a guess', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id });

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'journal' }));

    expect(err.status).toBe(400);
    expect(err.code).toBe('journal_required');
    expect(journeyStub.canEdit).not.toHaveBeenCalled();
  });

  it('DAWARICH-SUG-013: a journey domain that returns nothing leaves the suggestion in review', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id });
    journeyStub.createEntry.mockReturnValue(null);

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'journal', journalId: 12 }));

    expect(err.status).toBe(404);
    expect(rowOf(id).state).toBe('new');
  });
});

// ── accept: bucket list ──────────────────────────────────────────────────────

describe('DawarichSuggestionsService — ticking off a wish', () => {
  it('DAWARICH-SUG-014: a wish owned by somebody else is a 404 and stays untouched', () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const theirWish = seedBucketItem(stranger.id, { name: 'Their Hallstatt' });
    const id = seedSuggestion({ userId: user.id });

    const err = refusalFrom(() =>
      svc.accept(user.id, id, { target: 'bucket_list', bucketListItemId: theirWish }),
    );

    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
    expect(bucketOf(theirWish).visited_at).toBeNull();
    expect(rowOf(id).state).toBe('new');
  });

  it("DAWARICH-SUG-015: the caller's own wish is ticked with the stay's arrival and marked as imported", () => {
    const { user } = createUser(testDb);
    const wish = seedBucketItem(user.id, { name: 'Hallstatt' });
    const id = seedSuggestion({ userId: user.id, startedAt: '2026-09-01T09:30:00Z' });

    const result = svc.accept(user.id, id, { target: 'bucket_list', bucketListItemId: wish });

    const item = bucketOf(wish);
    expect(item.visited_at).toBe('2026-09-01T09:30:00Z');
    expect(item.visited_source).toBe('dawarich');
    expect(result.bucketListItemId).toBe(wish);
    expect(result.createdPlaceId).toBeNull();
    expect(rowOf(id).accepted_bucket_list_item_id).toBe(wish);
  });

  it('DAWARICH-SUG-016: with no wish named in the body, the matched one is used', () => {
    const { user } = createUser(testDb);
    const wish = seedBucketItem(user.id, { name: 'Hallstatt' });
    const id = seedSuggestion({ userId: user.id, matchedBucketListItemId: wish });

    const result = svc.accept(user.id, id, { target: 'bucket_list' });

    expect(result.bucketListItemId).toBe(wish);
    expect(bucketOf(wish).visited_source).toBe('dawarich');
  });

  it('DAWARICH-SUG-017: with nothing named and nothing matched it is a 400', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id, matchedBucketListItemId: null });

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'bucket_list' }));

    expect(err.status).toBe(400);
    expect(err.code).toBe('bucket_required');
  });
});

// ── accept twice / state ─────────────────────────────────────────────────────

describe('DawarichSuggestionsService — what an acceptance closes off', () => {
  it('DAWARICH-SUG-018: accepting an already accepted suggestion is a 409, not a second place', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const id = seedSuggestion({ userId: user.id, tripId: trip.id });

    const first = svc.accept(user.id, id, { target: 'place', tripId: trip.id });
    expect(placesStub.create).toHaveBeenCalledTimes(1);

    const err = refusalFrom(() => svc.accept(user.id, id, { target: 'place', tripId: trip.id }));

    expect(err.status).toBe(409);
    expect(err.code).toBe('already_accepted');
    expect(placesStub.create).toHaveBeenCalledTimes(1);
    // Still pointing at the first place, so the refusal cost nothing and created nothing.
    expect(rowOf(id).accepted_place_id).toBe(first.createdPlaceId);
    expect(testDb.prepare('SELECT COUNT(*) AS n FROM places WHERE trip_id = ?').get(trip.id)).toEqual({ n: 1 });
  });

  it('DAWARICH-SUG-019: setState cannot pull an accepted suggestion back into review', () => {
    const { user } = createUser(testDb);
    const wish = seedBucketItem(user.id);
    const id = seedSuggestion({ userId: user.id });
    svc.accept(user.id, id, { target: 'bucket_list', bucketListItemId: wish });

    const back = svc.setState(user.id, id, 'new');

    expect(back?.state).toBe('accepted');
    expect(rowOf(id).state).toBe('accepted');
    // Dismissing it is refused the same way — the tick it produced is its own thing now.
    expect(svc.setState(user.id, id, 'dismissed')?.state).toBe('accepted');
    expect(rowOf(id).target).toBe('bucket_list');
  });

  it('DAWARICH-SUG-020: a suggestion still in review dismisses and restores', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id });

    expect(svc.setState(user.id, id, 'dismissed')?.state).toBe('dismissed');
    expect(svc.setState(user.id, id, 'new')?.state).toBe('new');
  });

  it("DAWARICH-SUG-021: setState on a stranger's suggestion answers null and writes nothing", () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const theirs = seedSuggestion({ userId: stranger.id });

    expect(svc.setState(user.id, theirs, 'dismissed')).toBeNull();
    expect(rowOf(theirs).state).toBe('new');
  });
});

// ── bucket-list confirmation ─────────────────────────────────────────────────

describe('DawarichSuggestionsService — confirming a scan', () => {
  it('DAWARICH-SUG-022: confirmBucketVisits only touches wishes that were not ticked yet', () => {
    const { user } = createUser(testDb);
    const open = seedBucketItem(user.id, { name: 'Hallstatt' });
    const alreadyTicked = seedBucketItem(user.id, {
      name: 'Kyoto',
      visitedAt: '2026-01-04T12:00:00Z',
      visitedSource: 'manual',
    });

    const updated = svc.confirmBucketVisits(user.id, [open, alreadyTicked], '2026-09-05T10:00:00Z');

    expect(updated).toBe(1);
    expect(bucketOf(open).visited_at).toBe('2026-09-05T10:00:00Z');
    expect(bucketOf(open).visited_source).toBe('dawarich');
    // The hand-ticked one keeps both its date and who decided it.
    expect(bucketOf(alreadyTicked).visited_at).toBe('2026-01-04T12:00:00Z');
    expect(bucketOf(alreadyTicked).visited_source).toBe('manual');
  });

  it("DAWARICH-SUG-023: confirmBucketVisits ignores ids that are not the caller's", () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const mine = seedBucketItem(user.id);
    const theirs = seedBucketItem(stranger.id);

    const updated = svc.confirmBucketVisits(user.id, [mine, theirs]);

    expect(updated).toBe(1);
    expect(bucketOf(theirs).visited_at).toBeNull();
    expect(bucketOf(mine).visited_at).not.toBeNull();
  });

  it('DAWARICH-SUG-024: clearBucketVisit clears the source with the date, and only for the owner', () => {
    const { user } = createUser(testDb);
    const { user: stranger } = createUser(testDb);
    const mine = seedBucketItem(user.id, { visitedAt: '2026-09-05T10:00:00Z', visitedSource: 'dawarich' });
    const theirs = seedBucketItem(stranger.id, { visitedAt: '2026-09-05T10:00:00Z', visitedSource: 'dawarich' });

    expect(svc.clearBucketVisit(user.id, mine)).toBe(true);
    expect(bucketOf(mine).visited_at).toBeNull();
    expect(bucketOf(mine).visited_source).toBeNull();

    expect(svc.clearBucketVisit(user.id, theirs)).toBe(false);
    expect(bucketOf(theirs).visited_at).toBe('2026-09-05T10:00:00Z');
  });
});

// ── bucket-list scan (client stubbed, never the network) ─────────────────────

describe('DawarichSuggestionsService — scanning for stays', () => {
  it('DAWARICH-SUG-025: a scan without a connection refuses before a single request', async () => {
    const { user } = createUser(testDb);
    seedBucketItem(user.id);
    dawarichStub.getCredentials.mockReturnValue(null);

    const err = await asyncRefusalFrom(() => svc.scanBucketList(user.id));

    expect(err.status).toBe(400);
    expect(err.code).toBe('not_connected');
    expect(clientStub.findVisitsNear).not.toHaveBeenCalled();
  });

  it('DAWARICH-SUG-026: the longest stay wins over the nearest, and a wish without coordinates reports as skipped', async () => {
    const { user } = createUser(testDb);
    const wish = seedBucketItem(user.id, { name: 'Hallstatt' });
    seedBucketItem(user.id, { name: 'Somewhere vague', lat: null, lng: null });
    clientStub.findVisitsNear.mockResolvedValue([
      {
        timestamp: 1757000000,
        distance_meters: 12,
        points_count: 4,
        // The bus stopping outside: nearest, and far too short to be the visit.
        visit_details: { start_time: '2026-09-04T10:00:00Z', end_time: '2026-09-04T10:05:00Z', duration_minutes: 5 },
      },
      {
        timestamp: 1757003600,
        distance_meters: 180,
        points_count: 42,
        visit_details: { start_time: '2026-09-04T12:00:00Z', end_time: '2026-09-04T13:30:00Z', duration_minutes: 90 },
      },
    ]);

    const scan = await svc.scanBucketList(user.id);

    expect(scan.skippedWithoutCoordinates).toBe(1);
    expect(scan.truncated).toBe(false);
    expect(scan.matches).toHaveLength(1);
    expect(scan.matches[0]).toMatchObject({
      itemId: wish,
      name: 'Hallstatt',
      alreadyVisited: false,
      match: { at: '2026-09-04T12:00:00Z', minutes: 90, distanceMeters: 180, points: 42 },
    });
  });

  it('DAWARICH-SUG-027: a wish whose lookup fails reads as "no match", not as a failed scan', async () => {
    const { user } = createUser(testDb);
    seedBucketItem(user.id, { name: 'Hallstatt' });
    clientStub.findVisitsNear.mockRejectedValue(new Error('upstream is down'));

    const scan = await svc.scanBucketList(user.id);

    expect(scan.matches).toHaveLength(1);
    expect(scan.matches[0].match).toBeNull();
  });
});

// ── Atlas ────────────────────────────────────────────────────────────────────

describe('DawarichSuggestionsService — the Atlas hand-off', () => {
  it('DAWARICH-SUG-028: acceptAtlasCountries marks every code through the Atlas with the dawarich source', () => {
    const { user } = createUser(testDb);

    const marked = svc.acceptAtlasCountries(user.id, ['de', ' fr ', 'us']);

    expect(marked).toBe(3);
    expect(atlasStub.markCountry).toHaveBeenCalledTimes(3);
    expect(atlasStub.markCountry).toHaveBeenNthCalledWith(1, user.id, 'DE', 'dawarich');
    expect(atlasStub.markCountry).toHaveBeenNthCalledWith(2, user.id, 'FR', 'dawarich');
    expect(atlasStub.markCountry).toHaveBeenNthCalledWith(3, user.id, 'US', 'dawarich');
  });

  it('DAWARICH-SUG-042: the count is what was added, not what was asked for', () => {
    const { user } = createUser(testDb);
    // A country already on the map is an INSERT OR IGNORE that changes nothing,
    // and "2 countries added" for one country is a toast that lies.
    atlasStub.markCountry.mockImplementation((_userId: number, code: string) => code === 'FR');

    expect(svc.acceptAtlasCountries(user.id, ['de', 'fr'])).toBe(1);
  });

  it('DAWARICH-SUG-029: anything that is not a two-letter code is skipped rather than written', () => {
    const { user } = createUser(testDb);

    const marked = svc.acceptAtlasCountries(user.id, ['XYZ', 'D', '', '  ', 'D1', 'at']);

    expect(marked).toBe(1);
    expect(atlasStub.markCountry).toHaveBeenCalledTimes(1);
    expect(atlasStub.markCountry).toHaveBeenCalledWith(user.id, 'AT', 'dawarich');
  });

  it('DAWARICH-SUG-030: atlasSuggestions codes what it can, lists what it cannot, and flags what TREK already has', async () => {
    const { user } = createUser(testDb);
    testDb.prepare('INSERT INTO visited_countries (user_id, country_code) VALUES (?, ?)').run(user.id, 'DE');
    clientStub.listVisitedCities.mockResolvedValue([
      { country: 'Germany', cities: [{ city: 'Berlin', stayed_for: 120, timestamp: 1757000000 }] },
      { country: 'France', cities: [] },
      { country: 'Absurdistan', cities: [] },
    ]);

    const suggestions = await svc.atlasSuggestions(user.id, new Date('2026-08-01'), new Date('2026-09-01'));

    expect(suggestions.countries.map((c) => c.countryCode)).toEqual(['DE', 'FR']);
    expect(suggestions.countries[0]).toMatchObject({ sourceName: 'Germany', alreadyVisited: true });
    expect(suggestions.countries[0].cities[0]).toMatchObject({ name: 'Berlin', minutes: 120 });
    expect(suggestions.countries[1].alreadyVisited).toBe(false);
    // A country TREK cannot code is still a country the user went to.
    expect(suggestions.unresolved).toEqual(['Absurdistan']);
  });
  // ── What an acceptance tells the rest of the trip ──────────────────────────

  it('DAWARICH-SUG-031: accepting as a place broadcasts it like any other place, socket id and all', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const id = seedSuggestion({ userId: user.id, tripId: trip.id, name: 'Museum Ludwig' });

    const result = svc.accept(user.id, id, { target: 'place', tripId: trip.id }, 'socket-7');

    expect(placesStub.broadcast).toHaveBeenCalledWith(
      String(trip.id),
      'place:created',
      { place: expect.objectContaining({ id: result.createdPlaceId }) },
      'socket-7',
    );
    // The journey mirror is the other half of what the places controller does.
    expect(placesStub.onCreated).toHaveBeenCalledWith(String(trip.id), result.createdPlaceId);
  });

  it('DAWARICH-SUG-039: a member refused place_edit is refused here too', () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const id = seedSuggestion({ userId: member.id, tripId: trip.id });
    permissionsStub.checkPermission.mockImplementation((action: string) => action !== 'place_edit');

    expect(() => svc.accept(member.id, id, { target: 'place', tripId: trip.id })).toThrow(AcceptError);
    // Nothing written, and the stay is still waiting rather than marked handled.
    expect(placesStub.create).not.toHaveBeenCalled();
    expect(rowOf(id).state).toBe('new');
  });

  it('DAWARICH-SUG-040: pinning to a day asks day_edit as well, and writes nothing without it', () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const day = createDay(testDb, trip.id, { date: '2026-09-01' });
    const id = seedSuggestion({ userId: member.id, tripId: trip.id });
    permissionsStub.checkPermission.mockImplementation((action: string) => action !== 'day_edit');

    expect(() => svc.accept(member.id, id, { target: 'place', tripId: trip.id, dayId: day.id })).toThrow(AcceptError);
    expect(placesStub.create).not.toHaveBeenCalled();
    expect(rowOf(id).state).toBe('new');
  });

  it('DAWARICH-SUG-041: the permission is asked about the trip owner, not about the caller', () => {
    const { user: owner } = createUser(testDb);
    const { user: member } = createUser(testDb);
    const trip = createTrip(testDb, owner.id);
    addTripMember(testDb, trip.id, member.id);
    const id = seedSuggestion({ userId: member.id, tripId: trip.id });

    svc.accept(member.id, id, { target: 'place', tripId: trip.id });

    expect(permissionsStub.checkPermission).toHaveBeenCalledWith('place_edit', 'user', owner.id, member.id, true);
  });

  it('DAWARICH-SUG-038: a place made from a recording says where it came from', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const id = seedSuggestion({ userId: user.id, tripId: trip.id });

    const result = svc.accept(user.id, id, { target: 'place', tripId: trip.id });

    const place = testDb
      .prepare('SELECT source FROM places WHERE id = ?')
      .get(result.createdPlaceId) as { source: string | null };
    expect(place.source).toBe('dawarich');
  });

  it('DAWARICH-SUG-032: a stay accepted onto a day broadcasts the assignment too', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id, { date: '2026-09-01' });
    const id = seedSuggestion({ userId: user.id, tripId: trip.id });
    assignmentsStub.createAssignment.mockReturnValue({ id: 4242, day_id: day.id });

    svc.accept(user.id, id, { target: 'place', tripId: trip.id, dayId: day.id }, 'socket-9');

    expect(assignmentsStub.broadcast).toHaveBeenCalledWith(
      String(trip.id),
      'assignment:created',
      { assignment: { id: 4242, day_id: day.id } },
      'socket-9',
    );
  });

  it('DAWARICH-SUG-033: an assignment the domain refuses to create is not broadcast as one', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const day = createDay(testDb, trip.id, { date: '2026-09-01' });
    const id = seedSuggestion({ userId: user.id, tripId: trip.id });
    assignmentsStub.createAssignment.mockReturnValue(undefined);

    svc.accept(user.id, id, { target: 'place', tripId: trip.id, dayId: day.id });

    expect(assignmentsStub.broadcast).not.toHaveBeenCalled();
  });

  // ── An acceptance whose result was deleted ────────────────────────────────
  //
  // Deleting the place is how somebody says "not that one" after the fact. The
  // stay then has nothing to show for itself and belongs back in the review
  // list; leaving it under "already dealt with" is a dead end, because the row
  // points at a place that is gone and accepting it again is refused as a
  // duplicate.

  it('DAWARICH-SUG-034: deleting the place an acceptance created puts the stay back into review', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const id = seedSuggestion({ userId: user.id, tripId: trip.id });
    const result = svc.accept(user.id, id, { target: 'place', tripId: trip.id });
    expect(rowOf(id).state).toBe('accepted');

    testDb.prepare('DELETE FROM places WHERE id = ?').run(result.createdPlaceId);

    const listed = svc.list(user.id, {}).suggestions.find((s) => s.id === id)!;
    expect(listed.state).toBe('new');
    expect(listed.target).toBeNull();
    expect(listed.acceptedPlaceId).toBeNull();
    // And it can be accepted again rather than answering 409 forever.
    expect(() => svc.accept(user.id, id, { target: 'place', tripId: trip.id })).not.toThrow();
  });

  it('DAWARICH-SUG-035: an acceptance whose place still exists is left alone', () => {
    const { user } = createUser(testDb);
    const trip = createTrip(testDb, user.id);
    const id = seedSuggestion({ userId: user.id, tripId: trip.id });
    svc.accept(user.id, id, { target: 'place', tripId: trip.id });

    const listed = svc.list(user.id, {}).suggestions.find((s) => s.id === id)!;
    expect(listed.state).toBe('accepted');
    expect(listed.acceptedPlaceId).not.toBeNull();
  });

  it('DAWARICH-SUG-036: a journal acceptance reopens once its entry is gone', () => {
    const { user } = createUser(testDb);
    const id = seedSuggestion({ userId: user.id, tripId: null });
    const journeyId = Number(
      testDb
        .prepare(
          "INSERT INTO journeys (user_id, title, status, created_at, updated_at) VALUES (?, 'Trip diary', 'active', 0, 0)",
        )
        .run(user.id).lastInsertRowid,
    );
    const entryId = Number(
      testDb
        .prepare(
          "INSERT INTO journey_entries (journey_id, author_id, type, title, entry_date, created_at, updated_at) VALUES (?, ?, 'entry', 'Cafe', '2026-09-01', 0, 0)",
        )
        .run(journeyId, user.id).lastInsertRowid,
    );
    journeyStub.createEntry.mockReturnValue({ id: entryId });

    svc.accept(user.id, id, { target: 'journal', journalId: journeyId });
    expect(svc.list(user.id, {}).suggestions.find((s) => s.id === id)!.state).toBe('accepted');

    testDb.prepare('DELETE FROM journey_entries WHERE id = ?').run(entryId);

    expect(svc.list(user.id, {}).suggestions.find((s) => s.id === id)!.state).toBe('new');
  });

  it('DAWARICH-SUG-037: reopening is scoped to the caller — another user\'s orphan stays put', () => {
    const { user: mine } = createUser(testDb);
    const { user: theirs } = createUser(testDb);
    const trip = createTrip(testDb, theirs.id);
    const id = seedSuggestion({ userId: theirs.id, tripId: trip.id });
    const result = svc.accept(theirs.id, id, { target: 'place', tripId: trip.id });
    testDb.prepare('DELETE FROM places WHERE id = ?').run(result.createdPlaceId);

    svc.list(mine.id, {});

    expect(rowOf(id).state).toBe('accepted');
  });
});
