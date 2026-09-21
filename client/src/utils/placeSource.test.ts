import { describe, expect, it } from 'vitest'
import { offersGoogleRetry, sourceLabelFor } from './placeSource'

describe('offersGoogleRetry', () => {
  it('FE-PLACESOURCE-001: offers Google for a list the index or OpenStreetMap answered, only where a key exists', () => {
    expect(offersGoogleRetry('trek-places+openstreetmap', true)).toBe(true)
    expect(offersGoogleRetry('openstreetmap', true)).toBe(true)
    expect(offersGoogleRetry('trek-places+plugin', true)).toBe(true)
    expect(offersGoogleRetry('trek-places+openstreetmap', false)).toBe(false)
  })

  it('FE-PLACESOURCE-002: a list Google produced, the offline cache and no list at all have nowhere further to go', () => {
    expect(offersGoogleRetry('google', true)).toBe(false)
    expect(offersGoogleRetry('google+plugin', true)).toBe(false)
    expect(offersGoogleRetry('offline-cache', true)).toBe(false)
    expect(offersGoogleRetry('', true)).toBe(false)
  })
})

describe('sourceLabelFor', () => {
  it('FE-PLACESOURCE-003: a row names its own index, else the list it came from', () => {
    const t = (k: string) => k
    expect(sourceLabelFor({ source: 'openstreetmap' }, 'trek-places+openstreetmap', t)).toBe('OpenStreetMap')
    expect(sourceLabelFor({}, 'google', t)).toBe('Google')
    expect(sourceLabelFor({}, 'amap', t)).toBe('places.source.amap')
  })
})
