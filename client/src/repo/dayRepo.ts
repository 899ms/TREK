import { daysApi } from '../api/client'
import { offlineDb, upsertDays, upsertTrip } from '../db/offlineDb'
import { isEffectivelyOffline } from '../sync/networkMode'
import { onlineThenCache } from './withOfflineFallback'
import type { Day, Trip } from '../types'

export const dayRepo = {
  async list(tripId: number | string): Promise<{ days: Day[] }> {
    return onlineThenCache(
      async () => {
        const result = await daysApi.list(tripId)
        upsertDays(result.days)
        return result
      },
      async () => ({
        days: (await offlineDb.days
          .where('trip_id')
          .equals(Number(tripId))
          .sortBy('day_number' as keyof Day)) as Day[],
      }),
    )
  },

  /**
   * Delete a day. Online only, deliberately: the server cancels the stays on the
   * day, lets go of its bookings and moves the dates of the days after it, and a
   * queued offline write could not replay that faithfully. The cached row goes
   * right away, since this tab never hears its own day:deleted, and the trip the
   * server answers with (new day count, maybe a new end date) replaces the cached one.
   */
  async remove(tripId: number | string, dayId: number): Promise<{ trip?: Trip }> {
    if (isEffectivelyOffline()) throw new Error('Deleting a day needs a connection')
    const result = await daysApi.delete(tripId, dayId)
    await offlineDb.days.delete(dayId)
    if (result.trip) await upsertTrip(result.trip)
    return { trip: result.trip }
  },
}
