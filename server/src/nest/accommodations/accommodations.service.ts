import { Injectable } from '@nestjs/common';
import type { TrekWsPayload, TrekWsTripEventName } from '@trek/shared';
import { RealtimeService } from '../realtime/realtime.service';
import { DatabaseService, type PlaceWithTags, type TripAccess } from '../database/database.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AssignmentsService } from '../assignments/assignments.service';
import type { User } from '../../types';

type Trip = TripAccess;

type MirroredAssignment = ReturnType<AssignmentsService['createAssignment']>;

/** How a surface sends the mirror's events; see announceMirror. */
export type MirrorSender = <E extends TrekWsTripEventName>(event: E, payload: TrekWsPayload<E>) => void;

/** What a stay write did to the day plan, on top of writing the stay itself. */
export interface AccommodationMirror {
  /** The day stop the booking added, or null when that day already held the place. */
  created: MirroredAssignment | null;
  /** Day stops the booking took back, because it moved days or was deleted. */
  removed: { id: number; dayId: number }[];
  /** The place, when this write was the one that typed it as lodging. */
  stamped: PlaceWithTags | null;
}

/** A write that left the day plan alone. Exported for the surfaces that write a
 *  stay row themselves and have to answer with a mirror either way. */
export const noStayMirror = (): AccommodationMirror => ({ created: null, removed: [], stamped: null });
const noMirror = noStayMirror;

export interface DayAccommodation {
  id: number;
  trip_id: number;
  place_id: number | null;
  start_day_id: number;
  end_day_id: number;
  check_in: string | null;
  check_in_end: string | null;
  check_out: string | null;
  confirmation: string | null;
  notes: string | null;
}

export interface CreateAccommodationData {
  place_id: number;
  start_day_id: number;
  end_day_id: number;
  check_in?: string;
  check_in_end?: string;
  check_out?: string;
  confirmation?: string;
  notes?: string;
}

/**
 * Accommodations: the stay rows in day_accommodations plus the hotel reservation
 * and budget item that hang off them.
 *
 * The SQL used to live on DaysService while this class owned the routes and
 * delegated every call into it — one fachlichkeit split across two modules.
 * The statements moved here unchanged. What deliberately stayed in days/ is the
 * reorder side: assertNoInvertedAccommodation and resyncAccommodationDays are
 * about re-dating day rows, and the accommodation is the thing being carried,
 * not the thing doing the carrying.
 *
 * Still gated by 'day_edit', the same permission as days.
 *
 * It also owns the day stop a booking implies. A road-trip stop IS a day
 * assignment: the rail, the server-side plan and the map all build their stops
 * from day_assignments and only look the stay up afterwards, to hang check-in
 * and check-out on one. A stay written without an assignment is therefore
 * invisible to every routing surface, which is what made people enter their
 * hotel a second time as an ordinary place. The road-trip side has always
 * written both halves in one go (the place, its day, and the stay); this is the
 * day planner catching up, in the domain that writes the stay, so the next
 * surface to book a night does not have to remember it.
 */
@Injectable()
export class AccommodationsService {
  constructor(
    private readonly dbs: DatabaseService,
    private readonly permissions: PermissionsService,
    private readonly realtime: RealtimeService,
    private readonly assignments: AssignmentsService,
  ) {}

  private get db() {
    return this.dbs;
  }

  /** Owner or member, returning the trip. Takes a number too: the MCP tools pass
   *  the parsed id, the REST path the raw param. */
  verifyTripAccess(tripId: string | number, userId: number) {
    return this.dbs.canAccessTrip(Number(tripId), userId);
  }

  canEdit(trip: Trip, user: User): boolean {
    return this.permissions.checkPermission('day_edit', user.role, trip.user_id, user.id, trip.user_id !== user.id);
  }

  broadcast<E extends TrekWsTripEventName>(tripId: string, event: E, payload: TrekWsPayload<E>, socketId: string | undefined): void {
    this.realtime.broadcast(tripId, event, payload, socketId);
  }

  // -------------------------------------------------------------------------
  // The route-facing names the controller has always used.
  // -------------------------------------------------------------------------

  list(tripId: string | number) {
    return this.listAccommodations(tripId);
  }

  validateRefs(tripId: string | number, placeId?: number, startDayId?: number, endDayId?: number) {
    return this.validateAccommodationRefs(tripId, placeId, startDayId, endDayId);
  }

  get(id: string | number, tripId: string | number) {
    return this.getAccommodation(id, tripId);
  }

  create(tripId: string | number, data: CreateAccommodationData) {
    return this.createAccommodation(tripId, data);
  }

  update(id: string | number, existing: DayAccommodation, fields: Parameters<AccommodationsService['updateAccommodation']>[2]) {
    return this.updateAccommodation(id, existing, fields);
  }

  remove(id: string | number, opts: { keepStop?: boolean } = {}) {
    return this.deleteAccommodation(id, opts);
  }

  // -------------------------------------------------------------------------
  // For a surface that writes the stay row itself
  //
  // The booking form does: it fills day_accommodations straight from a hotel
  // reservation, with its own COALESCE semantics and its own field set, and
  // folding that into createAccommodation would mean bending one of the two out
  // of shape. What must not be duplicated is the stop, so these three open the
  // mirror to it and keep the SQL here.
  //
  // A night entered on the booking form is a night entered in Days: it shows in
  // the day header exactly like one added there. Road trip mode draws the same
  // booking as a service stop instead, so the stop is not a second edit to the
  // day plan, it is the same one in the other view. That is why writing it does
  // not ask for more than the booking already did.
  // -------------------------------------------------------------------------

  /** Put a freshly written stay on the map. */
  attachStayStop(accommodationId: number, placeId: number | null, dayId: number): AccommodationMirror {
    return this.mirrorStay(accommodationId, placeId, dayId);
  }

  /** Carry a stay's own stop over to where the stay now is. */
  moveStayStop(accommodationId: number, placeId: number | null, dayId: number): AccommodationMirror {
    return this.remirrorStay(accommodationId, placeId, dayId);
  }

  /** Take back the stops of a stay that is being deleted elsewhere. */
  dropStayStops(accommodationId: number): AccommodationMirror {
    return this.releaseStops(accommodationId, {});
  }

  /**
   * Send what a stay write did to the day plan, and let the journey skeletons
   * catch up the way an assignment route does.
   *
   * Takes the sender rather than broadcasting itself: REST and the plugin RPC
   * hand their socket id in, the MCP tools tag their events, and the fan-out is
   * the one part that must not exist in three copies.
   */
  announceMirror(tripId: string | number, mirror: AccommodationMirror, send: MirrorSender, socketId?: string): void {
    for (const stop of mirror.removed) send('assignment:deleted', { assignmentId: stop.id, dayId: stop.dayId });
    if (mirror.created) send('assignment:created', { assignment: mirror.created });
    if (mirror.stamped) send('place:updated', { place: mirror.stamped });
    if (mirror.created || mirror.removed.length > 0) this.assignments.reconcile(tripId, socketId);
  }

  // -------------------------------------------------------------------------
  // Accommodation CRUD
  // -------------------------------------------------------------------------


  private getAccommodationWithPlace(id: number | bigint) {
    return this.db.get(`
    SELECT a.*, p.name as place_name, p.address as place_address, p.image_url as place_image, p.lat as place_lat, p.lng as place_lng
    FROM day_accommodations a
    LEFT JOIN places p ON a.place_id = p.id
    WHERE a.id = ?
  `, id);
  }

  listAccommodations(tripId: string | number) {
    return this.db.all(`
    SELECT a.*, p.name as place_name, p.address as place_address, p.image_url as place_image, p.lat as place_lat, p.lng as place_lng,
           r.title as reservation_title
    FROM day_accommodations a
    LEFT JOIN places p ON a.place_id = p.id
    LEFT JOIN reservations r ON r.accommodation_id = a.id
    WHERE a.trip_id = ?
    ORDER BY a.created_at ASC
  `, tripId);
  }

  validateAccommodationRefs(tripId: string | number, placeId?: number, startDayId?: number, endDayId?: number) {
    const errors: { field: string; message: string }[] = [];
    if (placeId !== undefined) {
      const place = this.db.get('SELECT id FROM places WHERE id = ? AND trip_id = ?', placeId, tripId);
      if (!place) errors.push({ field: 'place_id', message: 'Place not found' });
    }
    if (startDayId !== undefined) {
      const startDay = this.db.get('SELECT id FROM days WHERE id = ? AND trip_id = ?', startDayId, tripId);
      if (!startDay) errors.push({ field: 'start_day_id', message: 'Start day not found' });
    }
    if (endDayId !== undefined) {
      const endDay = this.db.get('SELECT id FROM days WHERE id = ? AND trip_id = ?', endDayId, tripId);
      if (!endDay) errors.push({ field: 'end_day_id', message: 'End day not found' });
    }
    return errors;
  }

  /**
   * Put the booking's check-in day on the map.
   *
   * Only the check-in day gets a stop, even for a fortnight's stay: that is the
   * day you drive there, and it is exactly what the road-trip side writes for a
   * night it books itself. The later nights ride on the stay row, which is where
   * the rail reads check-out from.
   *
   * Runs inside the caller's transaction.
   */
  private mirrorStay(accommodationId: number, placeId: number | null, dayId: number): AccommodationMirror {
    const mirror = noMirror();
    // A stay can outlive its place (place_id is ON DELETE SET NULL) and the booking
    // form writes stays that never had one. Nothing to put on the map then.
    if (!placeId) return mirror;

    // 'hotel' is a service stop: it takes no number, stays out of the day's stop
    // count and falls under the existing "show service stops in Days" switch. Without
    // the stamp a booked night made here would look nothing like one booked in the
    // road trip. Only ever filled in when it is empty: a type the traveller picked
    // (a campsite, say) is theirs.
    const place = this.db.get<{ stop_type: string | null }>('SELECT stop_type FROM places WHERE id = ?', placeId);
    if (place && !place.stop_type) {
      this.db.run("UPDATE places SET stop_type = 'hotel' WHERE id = ?", placeId);
      mirror.stamped = this.db.getPlaceWithTags(placeId);
    }

    // The road-trip flow assigns the place to the day and only then books the night.
    // Claiming that row would make cancelling the booking delete a stop the traveller
    // placed, so the booking rides along with it and marks nothing as its own. Same
    // answer for a place already planned for that day by hand.
    if (this.db.get('SELECT id FROM day_assignments WHERE day_id = ? AND place_id = ?', dayId, placeId)) return mirror;

    // Through AssignmentsService, so the stop lands at the end of the day with the
    // order_index every other new assignment gets. Evening is where you arrive at a
    // hotel, and the day planner has no drive to position it against anyway.
    //
    // The booking id goes in with the INSERT, not as an UPDATE afterwards: what this
    // returns is the row the answer hands the client, and stamping the id on later
    // would leave that copy without it. The day list has nothing else to tell the
    // stop from a place the traveller added, so it would show the hotel a second
    // time until the next reload.
    mirror.created = this.assignments.createAssignment(dayId, placeId, null, { accommodationId });
    return mirror;
  }

  /** The day stops this booking, and only this booking, put on the plan. */
  private ownStops(accommodationId: number) {
    return this.db.all<{ id: number; day_id: number; place_id: number }>(
      'SELECT id, day_id, place_id FROM day_assignments WHERE accommodation_id = ?', accommodationId
    );
  }

  /**
   * Let go of the stops a booking owns, because the booking is going away.
   *
   * Only the ones it put there itself. A stop the traveller placed and then
   * booked a night at keeps standing, which is how cancelling a night in the road
   * trip has always behaved.
   *
   * keepStop hands it to the traveller instead of taking it away. That is the road
   * trip popup turning a night back into a pause: they asked to drop the booking,
   * not the place, and the stop is mid-drive where re-adding it would land it at
   * the end of the day.
   *
   * Runs inside the caller's transaction.
   */
  private releaseStops(accommodationId: number, opts: { keepStop?: boolean }): AccommodationMirror {
    const mirror = noMirror();
    for (const stop of this.ownStops(accommodationId)) {
      if (opts.keepStop) {
        this.db.run('UPDATE day_assignments SET accommodation_id = NULL WHERE id = ?', stop.id);
        continue;
      }
      this.db.run('DELETE FROM day_assignments WHERE id = ?', stop.id);
      mirror.removed.push({ id: stop.id, dayId: stop.day_id });
    }
    return mirror;
  }

  /**
   * Carry the mirrored stop over to wherever the booking now is.
   *
   * Only its own stop moves. A booking that owns none is one whose stop belongs to
   * the traveller: booked in road trip mode, where the place was put on the day
   * first, or booked for a place they had already planned there. Moving that is not
   * ours to do, and putting a second one on the new day next to it is exactly the
   * duplicate this whole change is meant to remove. Stays booked before any of this
   * existed get their stop from the migration, not from the next edit.
   *
   * Runs inside the caller's transaction.
   */
  private remirrorStay(accommodationId: number, placeId: number | null, dayId: number): AccommodationMirror {
    const own = this.ownStops(accommodationId);
    if (own.length === 0) return noMirror();
    if (own.length === 1 && own[0].day_id === dayId && own[0].place_id === placeId) return noMirror();

    const mirror = noMirror();
    for (const stop of own) {
      this.db.run('DELETE FROM day_assignments WHERE id = ?', stop.id);
      mirror.removed.push({ id: stop.id, dayId: stop.day_id });
    }
    const fresh = this.mirrorStay(accommodationId, placeId, dayId);
    mirror.created = fresh.created;
    mirror.stamped = fresh.stamped;
    return mirror;
  }

  createAccommodation(tripId: string | number, data: CreateAccommodationData) {
    const { place_id, start_day_id, end_day_id, check_in, check_in_end, check_out, confirmation, notes } = data;

    // The stay, its partner hotel reservation and the day stop it implies are one
    // logical write, and an atomic one, so a failed insert halfway can't leave an orphan.
    const written = this.db.transaction(() => {
      const result = this.db.run(
        'INSERT INTO day_accommodations (trip_id, place_id, start_day_id, end_day_id, check_in, check_in_end, check_out, confirmation, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        tripId, place_id, start_day_id, end_day_id, check_in || null, check_in_end || null, check_out || null, confirmation || null, notes || null
      );

      const newId = result.lastInsertRowid;

      // Auto-create linked reservation for this accommodation
      const placeName = this.db.get<{ name: string }>('SELECT name FROM places WHERE id = ?', place_id)?.name || 'Hotel';
      const startDayDate = this.db.get<{ date: string }>('SELECT date FROM days WHERE id = ?', start_day_id)?.date || null;
      const meta: Record<string, string> = {};
      if (check_in) meta.check_in_time = check_in;
      if (check_in_end) meta.check_in_end_time = check_in_end;
      if (check_out) meta.check_out_time = check_out;
      this.db.run(`
    INSERT INTO reservations (trip_id, day_id, title, reservation_time, location, confirmation_number, notes, status, type, accommodation_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 'hotel', ?, ?)
  `,
        tripId, start_day_id, placeName, startDayDate || null, null,
        confirmation || null, notes || null, newId,
        Object.keys(meta).length > 0 ? JSON.stringify(meta) : null
      );

      return { accommodationId: newId, mirror: this.mirrorStay(Number(newId), place_id ?? null, start_day_id) };
    });

    return { accommodation: this.getAccommodationWithPlace(written.accommodationId), mirror: written.mirror };
  }

  getAccommodation(id: string | number, tripId: string | number) {
    return this.db.get<DayAccommodation>('SELECT * FROM day_accommodations WHERE id = ? AND trip_id = ?', id, tripId);
  }

  updateAccommodation(id: string | number, existing: DayAccommodation, fields: {
    place_id?: number; start_day_id?: number; end_day_id?: number;
    check_in?: string; check_in_end?: string; check_out?: string; confirmation?: string; notes?: string;
  }) {
    const newPlaceId = fields.place_id !== undefined ? fields.place_id : existing.place_id;
    const newStartDayId = fields.start_day_id !== undefined ? fields.start_day_id : existing.start_day_id;
    const newEndDayId = fields.end_day_id !== undefined ? fields.end_day_id : existing.end_day_id;
    const newCheckIn = fields.check_in !== undefined ? fields.check_in : existing.check_in;
    const newCheckInEnd = fields.check_in_end !== undefined ? fields.check_in_end : existing.check_in_end;
    const newCheckOut = fields.check_out !== undefined ? fields.check_out : existing.check_out;
    const newConfirmation = fields.confirmation !== undefined ? fields.confirmation : existing.confirmation;
    const newNotes = fields.notes !== undefined ? fields.notes : existing.notes;

    // The stay row and the day stop that mirrors it describe the same booking, so a
    // move that wrote only one of the two must not survive.
    const mirror = this.db.transaction(() => {
      this.db.run(
        'UPDATE day_accommodations SET place_id = ?, start_day_id = ?, end_day_id = ?, check_in = ?, check_in_end = ?, check_out = ?, confirmation = ?, notes = ? WHERE id = ?',
        newPlaceId, newStartDayId, newEndDayId, newCheckIn, newCheckInEnd, newCheckOut, newConfirmation, newNotes, id
      );
      return this.remirrorStay(Number(id), newPlaceId, newStartDayId);
    });

    // Sync check-in/out/confirmation to every linked reservation. The booking form
    // lets more than one hotel booking point at the same block and there is no
    // unique constraint on reservations.accommodation_id, so a single .get() would
    // silently leave the others on the old times.
    const linkedRes = this.db.all<{ id: number; metadata: string | null }>('SELECT id, metadata FROM reservations WHERE accommodation_id = ?', Number(id));
    for (const res of linkedRes) {
      const meta = res.metadata ? JSON.parse(res.metadata) : {};
      if (newCheckIn) meta.check_in_time = newCheckIn;
      if (newCheckInEnd) meta.check_in_end_time = newCheckInEnd;
      if (newCheckOut) meta.check_out_time = newCheckOut;
      this.db.run('UPDATE reservations SET metadata = ?, confirmation_number = COALESCE(?, confirmation_number) WHERE id = ?',
        JSON.stringify(meta), newConfirmation || null, res.id);
    }

    return { accommodation: this.getAccommodationWithPlace(Number(id)), mirror };
  }

  /**
   * Delete accommodation and its linked reservations (and any linked budget items),
   * atomically.
   *
   * Takes ALL linked reservations, not just the first: reservations.accommodation_id
   * carries no foreign key and no unique constraint, so a second booking pointed at
   * the same block used to survive the delete as a row referencing an accommodation
   * that no longer exists. `linkedReservationId` / `deletedBudgetItemId` stay on the
   * result as the first of each, because the RPC, MCP and REST callers read them.
   */
  deleteAccommodation(id: string | number, opts: { keepStop?: boolean } = {}): {
    linkedReservationId: number | null;
    deletedBudgetItemId: number | null;
    linkedReservationIds: number[];
    deletedBudgetItemIds: number[];
    mirror: AccommodationMirror;
  } {
    return this.db.transaction(() => {
      const linkedRes = this.db.all<{ id: number }>('SELECT id FROM reservations WHERE accommodation_id = ?', Number(id));
      const deletedBudgetItemIds: number[] = [];
      for (const res of linkedRes) {
        const linkedBudget = this.db.get<{ id: number }>('SELECT id FROM budget_items WHERE reservation_id = ?', res.id);
        if (linkedBudget) {
          this.db.run('DELETE FROM budget_items WHERE id = ?', linkedBudget.id);
          deletedBudgetItemIds.push(linkedBudget.id);
        }
        this.db.run('DELETE FROM reservations WHERE id = ?', res.id);
      }

      const mirror = this.releaseStops(Number(id), opts);

      this.db.run('DELETE FROM day_accommodations WHERE id = ?', id);
      const linkedReservationIds = linkedRes.map(r => r.id);
      return {
        linkedReservationId: linkedReservationIds[0] ?? null,
        deletedBudgetItemId: deletedBudgetItemIds[0] ?? null,
        linkedReservationIds,
        deletedBudgetItemIds,
        mirror,
      };
    });
  }
}
