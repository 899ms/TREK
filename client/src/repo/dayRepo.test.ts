// FE-REPO-DAY-001 to FE-REPO-DAY-006
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/helpers/msw/server'
import { dayRepo } from './dayRepo'
import { offlineDb, clearAll } from '../db/offlineDb'
import { buildDay, buildTrip } from '../../tests/helpers/factories'

function setOnline(v: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value: v, writable: true, configurable: true })
}

beforeEach(async () => {
  await clearAll()
  setOnline(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dayRepo.list', () => {
  it('FE-REPO-DAY-001: online — returns REST days and caches them', async () => {
    const days = [buildDay({ id: 11, trip_id: 5 }), buildDay({ id: 12, trip_id: 5 })]
    server.use(http.get('/api/trips/5/days', () => HttpResponse.json({ days })))

    const result = await dayRepo.list(5)
    expect(result.days.map(d => d.id)).toEqual([11, 12])

    await new Promise(r => setTimeout(r, 0))
    expect(await offlineDb.days.where('trip_id').equals(5).count()).toBe(2)
  })

  it('FE-REPO-DAY-002: offline — returns the cached days sorted by day_number', async () => {
    await offlineDb.days.bulkPut([
      buildDay({ id: 21, trip_id: 5, day_number: 3 }),
      buildDay({ id: 22, trip_id: 5, day_number: 1 }),
      buildDay({ id: 23, trip_id: 5, day_number: 2 }),
      buildDay({ id: 24, trip_id: 6, day_number: 1 }),
    ])
    setOnline(false)

    const result = await dayRepo.list('5')
    expect(result.days.map(d => d.id)).toEqual([22, 23, 21])
  })

  it('FE-REPO-DAY-003: offline with an empty cache — returns an empty list', async () => {
    setOnline(false)
    expect((await dayRepo.list(404)).days).toEqual([])
  })

  it('FE-REPO-DAY-004: a 500 is rethrown, not masked by the cache', async () => {
    await offlineDb.days.put(buildDay({ id: 31, trip_id: 5 }))
    server.use(http.get('/api/trips/5/days', () => HttpResponse.json({ error: 'nope' }, { status: 500 })))

    await expect(dayRepo.list(5)).rejects.toThrow()
  })
})

describe('dayRepo.remove', () => {
  it('FE-REPO-DAY-005: online, deletes through the API, drops the cached row and caches the trip it answers with', async () => {
    await offlineDb.days.bulkPut([buildDay({ id: 41, trip_id: 5 }), buildDay({ id: 42, trip_id: 5 })])
    const trip = buildTrip({ id: 5, end_date: '2026-06-02' })
    let deleted = ''
    server.use(http.delete('/api/trips/5/days/41', ({ request }) => {
      deleted = new URL(request.url).pathname
      return HttpResponse.json({ success: true, trip })
    }))

    const result = await dayRepo.remove(5, 41)

    expect(deleted).toBe('/api/trips/5/days/41')
    expect(result.trip).toMatchObject({ id: 5, end_date: '2026-06-02' })
    expect(await offlineDb.days.get(41)).toBeUndefined()
    expect(await offlineDb.days.get(42)).toBeDefined()
    expect(await offlineDb.trips.get(5)).toMatchObject({ end_date: '2026-06-02' })
  })

  it('FE-REPO-DAY-006: offline, refuses without a request and keeps the cached row', async () => {
    await offlineDb.days.put(buildDay({ id: 51, trip_id: 5 }))
    const hit = vi.fn()
    server.use(http.delete('/api/trips/5/days/51', () => { hit(); return HttpResponse.json({ success: true }) }))
    setOnline(false)

    await expect(dayRepo.remove(5, 51)).rejects.toThrow('Deleting a day needs a connection')
    expect(hit).not.toHaveBeenCalled()
    expect(await offlineDb.days.get(51)).toBeDefined()
  })
})
