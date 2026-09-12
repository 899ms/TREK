import type { DawarichTrack, DawarichTrackDay } from '@trek/shared'

/**
 * Everything both map renderers need to agree on for the recorded-route
 * overlay, in one module.
 *
 * TREK draws no line twice the same way — Leaflet takes `<Polyline>` elements
 * and GL takes a GeoJSON source — so the *shape* cannot be shared. The colour,
 * the day ordering and the identity of a segment can, and they are exactly what
 * would drift between the two renderers if each carried its own copy.
 */

/**
 * The palette for the recorded route.
 *
 * Deliberately not derived from `var(--accent)`: the planned route already uses
 * the accent, and the whole point of this overlay is that it reads as *the
 * other thing* — what happened, next to what was planned. These are the same
 * hues Dawarich itself uses for its track modes, which makes the two products
 * agree about a line the user has seen in both.
 *
 * theme-lint-disable — map paint: Leaflet path options and GL paint
 * expressions cannot read a CSS variable, and the map is the one surface where
 * a fixed palette is the documented exception (client/src/theme/README.md).
 */
export const DAWARICH_TRAIL_COLOR = '#2563EB' // theme-lint-disable — map paint
/** The white casing under the line, so it stays visible over a satellite tile. */
export const DAWARICH_TRAIL_CASING = '#FFFFFF' // theme-lint-disable — map paint

/**
 * Per-day hues, cycled.
 *
 * A multi-day trip drawn in one colour is a scribble; per-day colours make "we
 * were here on Tuesday" readable at a glance. Six is enough to tell adjacent
 * days apart and few enough that the map does not turn into a rainbow.
 *
 * theme-lint-disable — map paint, same reason as above.
 */
export const DAWARICH_DAY_COLORS = [
  '#2563EB', // theme-lint-disable — map paint
  '#7C3AED', // theme-lint-disable — map paint
  '#0891B2', // theme-lint-disable — map paint
  '#DB2777', // theme-lint-disable — map paint
  '#EA580C', // theme-lint-disable — map paint
  '#059669', // theme-lint-disable — map paint
] as const

export function dayColor(index: number): string {
  return DAWARICH_DAY_COLORS[index % DAWARICH_DAY_COLORS.length]!
}

/** One drawable piece of the overlay, flattened out of the day/segment nesting. */
export interface DawarichTrailSegment {
  /** Stable across refetches, so a renderer can key on it instead of on array order. */
  id: string
  date: string
  color: string
  /** `[lat, lng]`, TREK's internal order. GeoJSON flips it at the boundary. */
  points: Array<[number, number]>
  mode: string | null
  startedAt: string
  endedAt: string
  distanceMeters: number | null
}

/**
 * Flatten a fetched track into drawable segments, optionally limited to one day.
 *
 * The day filter is what the timeline scrubber drives: selecting a day on the
 * planner should dim the rest of the trip rather than reload it, so the filter
 * happens here over data that is already in memory.
 */
export function trailSegments(
  track: DawarichTrack | null,
  onlyDate?: string | null,
): DawarichTrailSegment[] {
  if (!track) return []
  const days: DawarichTrackDay[] = onlyDate
    ? track.days.filter(day => day.date === onlyDate)
    : track.days

  const out: DawarichTrailSegment[] = []
  for (const day of days) {
    // The colour index comes from the day's position in the WHOLE track, not in
    // the filtered list — otherwise picking a day would repaint it.
    const index = track.days.findIndex(candidate => candidate.date === day.date)
    day.segments.forEach((segment, i) => {
      // Zod's tuple infers as "maybe two numbers, maybe more", so the pairs are
      // narrowed at runtime rather than cast. In practice the schema has already
      // guaranteed both are numbers; this is what makes the type honest without
      // an `as` at the boundary.
      const points = segment.points.flatMap((pair): Array<[number, number]> =>
        typeof pair[0] === 'number' && typeof pair[1] === 'number' ? [[pair[0], pair[1]]] : [],
      )
      if (points.length < 2) return
      out.push({
        id: `${day.date}-${i}`,
        date: day.date,
        color: dayColor(index < 0 ? 0 : index),
        points,
        mode: segment.mode,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
        distanceMeters: segment.distanceMeters,
      })
    })
  }
  return out
}

/** The overlay as a GeoJSON FeatureCollection, for the GL renderer. */
export function trailGeoJson(segments: DawarichTrailSegment[]): {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: { id: string; color: string; date: string; mode: string | null }
    geometry: { type: 'LineString'; coordinates: Array<[number, number]> }
  }>
} {
  return {
    type: 'FeatureCollection',
    features: segments.map(segment => ({
      type: 'Feature' as const,
      properties: {
        id: segment.id,
        color: segment.color,
        date: segment.date,
        mode: segment.mode,
      },
      geometry: {
        type: 'LineString' as const,
        // Internal order is [lat, lng] everywhere in TREK; GeoJSON wants the
        // other one, and this is the single place the overlay flips it.
        coordinates: segment.points.map((point): [number, number] => [point[1], point[0]]),
      },
    })),
  }
}

/** Total kilometres the overlay covers, for the panel that reports it. */
export function trailDistanceKm(segments: DawarichTrailSegment[]): number | null {
  const known = segments.filter(segment => segment.distanceMeters !== null)
  if (known.length === 0) return null
  return known.reduce((sum, segment) => sum + (segment.distanceMeters ?? 0), 0) / 1000
}
