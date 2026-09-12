// FE-DAWARICH-ATLASMODEL-001 to FE-DAWARICH-ATLASMODEL-010
import { describe, it, expect } from 'vitest'
import type { DawarichAtlasCountry, DawarichBucketMatch } from '@trek/shared'
import {
  cityLine,
  countryLabel,
  countryWindow,
  formatDistance,
  newCountries,
  orderedMatches,
} from './dawarichAtlasModel'

function match(over: Partial<DawarichBucketMatch> & { itemId: number }): DawarichBucketMatch {
  return {
    itemId: over.itemId,
    name: over.name ?? `Wish ${over.itemId}`,
    match: over.match === undefined ? { at: '2026-09-01T10:00:00Z', minutes: 90, distanceMeters: 40, points: 12 } : over.match,
    alreadyVisited: over.alreadyVisited ?? false,
  }
}

function country(over: Partial<DawarichAtlasCountry> & { countryCode: string }): DawarichAtlasCountry {
  return {
    countryCode: over.countryCode,
    sourceName: over.sourceName ?? over.countryCode,
    cities: over.cities ?? [],
    alreadyVisited: over.alreadyVisited ?? false,
  }
}

const t = (key: string, params?: Record<string, unknown>): string =>
  `${key}:${JSON.stringify(params ?? {})}`

describe('countryWindow', () => {
  it('FE-DAWARICH-ATLASMODEL-001: asks for exactly the year before the given moment', () => {
    const now = new Date('2026-09-12T18:00:00Z')
    const { from, to } = countryWindow(now)
    expect(to).toBe('2026-09-12T18:00:00.000Z')
    expect(from).toBe('2025-09-12T18:00:00.000Z')
  })
})

describe('orderedMatches', () => {
  it('FE-DAWARICH-ATLASMODEL-002: drops wishes the recordings found nothing for', () => {
    const ordered = orderedMatches([match({ itemId: 1, match: null }), match({ itemId: 2 })])
    expect(ordered.map(m => m.itemId)).toEqual([2])
  })

  it('FE-DAWARICH-ATLASMODEL-003: open wishes lead, already ticked ones follow', () => {
    const ordered = orderedMatches([
      match({ itemId: 1, alreadyVisited: true }),
      match({ itemId: 2 }),
    ])
    expect(ordered.map(m => m.itemId)).toEqual([2, 1])
  })

  it('FE-DAWARICH-ATLASMODEL-004: within a group the most recent visit comes first', () => {
    const ordered = orderedMatches([
      match({ itemId: 1, match: { at: '2026-01-02T10:00:00Z', minutes: 30, distanceMeters: 10, points: 3 } }),
      match({ itemId: 2, match: { at: '2026-06-02T10:00:00Z', minutes: 30, distanceMeters: 10, points: 3 } }),
    ])
    expect(ordered.map(m => m.itemId)).toEqual([2, 1])
  })

  it('FE-DAWARICH-ATLASMODEL-005: leaves the caller\'s array untouched', () => {
    const input = [match({ itemId: 1, alreadyVisited: true }), match({ itemId: 2 })]
    orderedMatches(input)
    expect(input.map(m => m.itemId)).toEqual([1, 2])
  })
})

describe('newCountries', () => {
  it('FE-DAWARICH-ATLASMODEL-006: only the ones a confirmation would actually change', () => {
    const offered = newCountries([
      country({ countryCode: 'DE', alreadyVisited: true }),
      country({ countryCode: 'NL' }),
    ])
    expect(offered.map(c => c.countryCode)).toEqual(['NL'])
  })
})

describe('countryLabel', () => {
  it('FE-DAWARICH-ATLASMODEL-007: names the country in the reader\'s language', () => {
    expect(countryLabel('NL', 'Netherlands', 'de')).toBe('Niederlande')
  })

  it('FE-DAWARICH-ATLASMODEL-008: falls back to Dawarich\'s own spelling for a code it cannot name', () => {
    // Not an ISO region: Intl either throws or echoes it back, and neither is a
    // name a reader would recognise.
    expect(countryLabel('ZZZZ', 'Freedonia', 'en')).toBe('Freedonia')
  })
})

describe('cityLine', () => {
  it('FE-DAWARICH-ATLASMODEL-009: lists the first few cities and stops', () => {
    const cities = ['Cologne', 'Bonn', 'Aachen', 'Trier'].map(name => ({
      name,
      minutes: 60,
      lastSeenAt: '2026-09-01T10:00:00Z',
    }))
    expect(cityLine(cities)).toBe('Cologne, Bonn, Aachen')
    expect(cityLine(cities, 1)).toBe('Cologne')
    expect(cityLine([])).toBe('')
  })
})

describe('formatDistance', () => {
  it('FE-DAWARICH-ATLASMODEL-010: metres up to a kilometre, then kilometres with one decimal', () => {
    expect(formatDistance(49.4, t)).toBe('dawarich.bucket.metersAway:{"meters":49}')
    expect(formatDistance(999, t)).toBe('dawarich.bucket.metersAway:{"meters":999}')
    expect(formatDistance(1400, t)).toBe('dawarich.bucket.kilometersAway:{"km":"1.4"}')
  })
})
