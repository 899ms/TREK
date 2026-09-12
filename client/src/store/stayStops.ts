import { useTripStore } from './tripStore'
import type { Assignment } from '../types'

/** The day-plan half of what an accommodation write answers with. */
export interface StayStopsResult {
  assignment?: Assignment | null
  removedAssignments?: { id: number; dayId: number }[]
}

/**
 * Fold the day stop a stay write reported back into the store.
 *
 * Booking a night also puts the place on its check-in day, because that stop is
 * what the road trip routes and the map draws. The server announces it over the
 * socket like any other assignment, but the socket deliberately skips the session
 * that sent the request (X-Socket-Id), so without this the one person who cannot
 * see their new stop is the one who just booked it. Goes through the same applier
 * the socket uses, so the write-through to IndexedDB happens either way.
 */
export function applyStayStops(result: StayStopsResult | null | undefined): void {
  if (!result) return
  const { handleRemoteEvent } = useTripStore.getState()
  for (const removed of result.removedAssignments ?? []) {
    handleRemoteEvent({ type: 'assignment:deleted', assignmentId: removed.id, dayId: removed.dayId })
  }
  if (result.assignment) handleRemoteEvent({ type: 'assignment:created', assignment: result.assignment })
}
