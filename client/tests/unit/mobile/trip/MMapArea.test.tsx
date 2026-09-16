import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '../../../helpers/render'
import { buildPlanner, buildShell } from '../../../helpers/mobileTrip'
import { buildPlace } from '../../../helpers/factories'
import type { AccessSpur, RoadtripDay } from '@trek/shared/roadtrip'
import type { MTripShellApi, TripPlanner } from '../../../../src/mobile/screens/trip/MTripShell'
import type { CompassMap } from '../../../../src/components/Map/MapCompassPill'
import { MAP_LAYER_SWITCHER_INSET, MAP_ROUND_CONTROL_SIZE } from '../../../../src/components/Map/MapLayerSwitcher'
import { useSettingsStore } from '../../../../src/store/settingsStore'

// FE-MOB-MAPAREA-001 to FE-MOB-MAPAREA-018

const mocks = vi.hoisted(() => ({
  poi: {} as Record<string, unknown>,
  /** The traveller's road trip preferences, read per trip by the area. */
  prefs: {} as Record<string, unknown>,
  /** Handed to onMapReady, standing in for a GL map that can rotate. */
  glMap: null as CompassMap | null,
  /** Last props the area handed the renderer, so its callbacks can be fired. */
  props: {} as Record<string, unknown>,
}))

// The real renderer boots Leaflet/MapLibre; the area only ever hands it props.
vi.mock('../../../../src/components/Map/MapViewAuto', () => ({
  MapViewAuto: (props: Record<string, unknown>) => {
    mocks.props = props
    ;(props.onMapReady as ((map: CompassMap | null) => void) | undefined)?.(mocks.glMap)
    return <div data-testid="map-renderer" />
  },
}))

vi.mock('../../../../src/components/Map/usePoiExplore', () => ({
  usePoiExplore: () => mocks.poi,
}))

vi.mock('../../../../src/hooks/useRoadtripSettings', () => ({
  useRoadtripSettings: (select: (p: Record<string, unknown>) => unknown) => select(mocks.prefs),
}))

import MMapArea from '../../../../src/mobile/screens/trip/map/MMapArea'

const COMPASS: CompassMap = {
  getBearing: () => 0,
  on: vi.fn(),
  off: vi.fn(),
  easeTo: vi.fn(),
}

function renderArea(shellOver: Partial<MTripShellApi> = {}, plannerOver: Partial<TripPlanner> = {}) {
  const planner = buildPlanner(plannerOver)
  // `mapFront` is what the floating chrome keys off since the map became one
  // instance shared by the plan tab and the road trip tab. `view` alone no longer
  // says whether the map is the front layer.
  const shell = buildShell({ view: 'map', mapFront: true, ...shellOver })
  return { planner, shell, ...render(<MMapArea planner={planner} shell={shell} />) }
}

/** The compass wrapper is the only element carrying an inline bottom offset. */
const compassBand = (container: HTMLElement) =>
  container.querySelector('[style*="--bottom-nav-h"]') as HTMLElement | null

/** One stage of a drive: two stops on day 1, one of them reached down a short spur. */
function stageDay(): RoadtripDay {
  return {
    dayId: 3, dayNumber: 1, date: '2026-05-01', title: null,
    stops: [
      {
        assignmentId: 31, ownerDayId: 3, ownerIndex: 0, placeId: 11, name: 'Hamburg',
        lat: 53.55, lng: 9.99, time: null, dwellMinutes: null,
        legMode: null, incomingLegMode: null, stopType: null,
      },
      {
        assignmentId: 32, ownerDayId: 3, ownerIndex: 1, placeId: 12, name: 'Lübeck',
        lat: 53.87, lng: 10.69, time: null, dwellMinutes: null,
        legMode: null, incomingLegMode: null, stopType: null,
      },
    ],
    legs: [], legVias: [[]], geometry: [], distance: 0, duration: 0,
    schedule: { entries: [], warnings: [] }, driveWarnings: [], dayWarning: null,
  } as unknown as RoadtripDay
}

/** The planner carrying that stage, plus a place from another day the stage leaves off. */
function stagePlanner(selectedDayId: number | null): TripPlanner {
  const base = buildPlanner()
  const spur: AccessSpur = { line: [[53.87, 10.69], [53.871, 10.692]], meters: 180, stopKey: '53.87000,10.69000,,' }
  return buildPlanner({
    selectedDayId,
    mapPlaces: [buildPlace({ id: 11 }), buildPlace({ id: 12 }), buildPlace({ id: 99 })],
    // Every planned place, which is what the all days view draws.
    roadtripMapPlaces: [buildPlace({ id: 11 }), buildPlace({ id: 12 })],
    roadtripRoutes: {
      ...base.roadtripRoutes,
      days: [stageDay()],
      lines: [[[53.55, 9.99], [53.87, 10.69]]],
      lineDays: [1],
      accessLines: [spur],
    },
  } as unknown as Partial<TripPlanner>)
}

/** What the area handed the renderer that a fresh copy would make it draw again. */
const DRAWN = ['places', 'route', 'routeColors', 'accessLines', 'focusPoints'] as const

beforeEach(() => {
  mocks.glMap = COMPASS
  mocks.prefs = {}
  mocks.poi = {
    active: new Set<string>(), pois: [], loadingKeys: new Set<string>(), errorKeys: new Set<string>(),
    moved: false, toggle: vi.fn(), searchArea: vi.fn(), onViewportChange: vi.fn(),
  }
  useSettingsStore.setState(s => ({ settings: { ...s.settings, map_poi_pill_enabled: true } }))
})

describe('MMapArea', () => {
  it('FE-MOB-MAPAREA-001: the POI bar takes the full width between the screen margins', () => {
    renderArea()

    const segment = screen.getAllByRole('button')[0]
    expect(segment.style.flexGrow).toBe('1')
  })

  it('FE-MOB-MAPAREA-002: the compass rides the same bottom offset as the locate button', () => {
    const { container } = renderArea()

    // LocationButton hard-codes `right: 12` off the same variable, so matching
    // the offset here is what keeps the two round controls on one line.
    expect(compassBand(container)?.style.bottom).toBe('calc(var(--bottom-nav-h, 84px) + 12px)')
    // Beside the base-layer switcher both engines draw in the corner: its inset, its
    // size and one gap. In the corner itself it lay under the switcher's frosted shell.
    expect(compassBand(container)?.style.left).toBe(`${MAP_LAYER_SWITCHER_INSET + MAP_ROUND_CONTROL_SIZE + 8}px`)
    expect(compassBand(container)?.className).not.toContain('left-3')
  })

  it('FE-MOB-MAPAREA-003: the map layer floats those controls a dock gap above the dock', () => {
    const { container } = renderArea()

    // The dock is 62px tall at safe-bottom + 12; the controls add their own 12.
    expect((container.firstElementChild as HTMLElement).className)
      .toContain('[--bottom-nav-h:calc(env(safe-area-inset-bottom,0px)+74px+var(--m-stage-lift,0px))]')
    // No lift off the stage: the plan tab has no bar in that band.
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--m-stage-lift')).toBe('0px')
  })

  it('FE-MOB-MAPAREA-013: on the stage the controls clear the stage bar by one gap', () => {
    const { container } = renderArea({ trTab: 'roadtrip', mapFront: true })

    // The bar is 61px tall and keeps a gap on both sides, so the round controls land
    // above it rather than on its top edge.
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--m-stage-lift')).toBe('76px')
  })

  it('FE-MOB-MAPAREA-014: behind the chain there is no bar to clear, so nothing lifts', () => {
    const { container } = renderArea({ trTab: 'roadtrip', mapFront: false })

    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--m-stage-lift')).toBe('0px')
  })

  it('FE-MOB-MAPAREA-004: a renderer that cannot rotate gets no compass', () => {
    mocks.glMap = null
    const { container } = renderArea()

    expect(compassBand(container)).toBeNull()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('FE-MOB-MAPAREA-005: turning the POI bar off leaves the compass alone', () => {
    useSettingsStore.setState(s => ({ settings: { ...s.settings, map_poi_pill_enabled: false } }))
    const { container } = renderArea()

    expect(screen.queryByLabelText('Cafés')).not.toBeInTheDocument()
    expect(compassBand(container)).not.toBeNull()
  })

  it('FE-MOB-MAPAREA-006: no floating chrome while the timeline covers the map', () => {
    const { container } = renderArea({ view: 'plan', mapFront: false })

    expect(screen.queryByLabelText('Cafés')).not.toBeInTheDocument()
    expect(compassBand(container)).toBeNull()
    // The renderer itself stays mounted so tiles and markers keep their warmth.
    expect(screen.getByTestId('map-renderer')).toBeInTheDocument()
  })

  it('FE-MOB-MAPAREA-007: a transport overlay tap opens the mobile transport sheet', () => {
    const { shell } = renderArea()

    ;(mocks.props.onReservationClick as (id: number) => void)(7)

    expect(shell.openSheet).toHaveBeenCalledWith('transport', { reservationId: 7 })
  })
  it('FE-MOB-MAPAREA-008: on the stage the pins are the search and the fuel offers, and nothing else', () => {
    const corridorHit = { osm_id: 'c1', name: 'Shell', lat: 53.5, lng: 9.8, category: 'fuel' }
    const offered = { osm_id: 'r1', name: 'Aral', lat: 53.4, lng: 9.7, category: 'fuel' }
    mocks.poi = { ...mocks.poi, pois: [{ osm_id: 'e1', name: 'Café', lat: 53.3, lng: 9.6, category: 'cafe' }] }
    const base = buildPlanner()
    renderArea({ trTab: 'roadtrip' }, {
      roadtripCorridor: { ...base.roadtripCorridor, visible: [corridorHit] },
      refuel: { ...base.refuel, offered: [offered] },
    } as unknown as Partial<TripPlanner>)

    const ids = (mocks.props.pois as Array<{ osm_id: string }>).map(p => p.osm_id)
    expect(ids).toEqual(expect.arrayContaining(['c1', 'r1']))
    // "What is around this piece of map" is a different question from "what is on the
    // way", and its bar is off this tab, so its pins would be pins nobody could clear.
    expect(ids).not.toContain('e1')
    expect(screen.queryByLabelText('Cafés')).not.toBeInTheDocument()
  })

  it('FE-MOB-MAPAREA-009: off the stage a corridor hit is not drawn at all', () => {
    const base = buildPlanner()
    renderArea({ trTab: 'plan' }, {
      roadtripCorridor: { ...base.roadtripCorridor, visible: [{ osm_id: 'c1', lat: 53.5, lng: 9.8, category: 'fuel' }] },
    } as unknown as Partial<TripPlanner>)

    // A pin with no route under it cannot explain where on the drive it sits.
    expect((mocks.props.pois as Array<{ osm_id: string }>).map(p => p.osm_id)).not.toContain('c1')
  })

  it('FE-MOB-MAPAREA-010: a pin tapped on the stage goes through the road trip door', () => {
    const { planner } = renderArea({ trTab: 'roadtrip' })

    const marker = { osm_id: 'c1', name: 'Shell', lat: 53.5, lng: 9.8, category: 'fuel', alongKm: 82 }
    ;(mocks.props.onPoiClick as (m: unknown) => void)(marker)

    expect(planner.handlePoiClick).toHaveBeenCalledWith(marker)
    expect(planner.openAddPlaceFromPoi).not.toHaveBeenCalled()
  })

  it('FE-MOB-MAPAREA-011: on the plan tab it stays the plain place form, carrying the day', () => {
    const { planner } = renderArea({ trTab: 'plan' }, { selectedDayId: 5 })

    const marker = { osm_id: 'e1', name: 'Café', lat: 53.3, lng: 9.6, category: 'cafe' }
    ;(mocks.props.onPoiClick as (m: unknown) => void)(marker)

    expect(planner.openAddPlaceFromPoi).toHaveBeenCalledWith(marker, 5)
    expect(planner.handlePoiClick).not.toHaveBeenCalled()
  })

  it('FE-MOB-MAPAREA-012: a focused hit takes the camera; with nothing pending the stage frames itself', () => {
    const focused = renderArea({ trTab: 'roadtrip' }, { mapFocusPoints: [[53.5, 9.8]] })
    expect(mocks.props.focusPoints).toEqual([[53.5, 9.8]])
    focused.unmount()

    renderArea({ trTab: 'roadtrip' })
    // The stage's own points, which is an array either way: going array → undefined →
    // array is two dependency changes, and the second throws away the traveller's pan.
    expect(Array.isArray(mocks.props.focusPoints)).toBe(true)
  })

  it('FE-MOB-MAPAREA-015: the compass never takes the base-layer switcher\'s slot, on either tab', () => {
    for (const shellOver of [{ trTab: 'plan' }, { trTab: 'roadtrip', mapFront: true }] as Partial<MTripShellApi>[]) {
      const { container, unmount } = renderArea(shellOver)

      expect(parseFloat(compassBand(container)?.style.left ?? '0'))
        .toBeGreaterThanOrEqual(MAP_LAYER_SWITCHER_INSET + MAP_ROUND_CONTROL_SIZE)
      // With the renderer mocked, the compass is still the one element in this layer
      // that sets --bottom-nav-h inline; its left offset joined the same style object.
      expect(container.querySelectorAll('[style*="--bottom-nav-h"]')).toHaveLength(1)
      unmount()
    }
  })

  it('FE-MOB-MAPAREA-016: a re-render with nothing new on the stage hands the map the same drawing', () => {
    const planner = stagePlanner(3)
    const shell = buildShell({ view: 'map', mapFront: true, trTab: 'roadtrip' })
    const { rerender } = render(<MMapArea planner={planner} shell={shell} />)
    const first = { ...mocks.props }

    // The stage really is what is drawn, so the identities below are about something.
    expect((first.places as Array<{ id: number }>).map(p => p.id)).toEqual([11, 12])
    expect(first.route).toHaveLength(1)
    expect(first.accessLines).toHaveLength(1)
    expect(first.focusPoints).toEqual([[53.55, 9.99], [53.87, 10.69]])

    // The shell re-renders on every store write, a satellite tap included. Fresh arrays
    // here would refit the camera over the traveller's pan and set the map's sources
    // again, which is also what kept the style too busy to draw the imagery.
    rerender(<MMapArea planner={planner} shell={shell} />)

    for (const key of DRAWN) expect(mocks.props[key]).toBe(first[key])
  })

  it('FE-MOB-MAPAREA-017: the all days view keeps its day colours between renders too', () => {
    mocks.prefs = { roadtrip_day_colors: true }
    const planner = stagePlanner(null)
    const shell = buildShell({ view: 'map', mapFront: true, trTab: 'roadtrip' })
    const { rerender } = render(<MMapArea planner={planner} shell={shell} />)
    const first = { ...mocks.props }

    // One colour per line, worked out per call, so without the memo a new array each time.
    expect(first.routeColors).toHaveLength(1)
    // Still an array with no stage, which FE-MOB-MAPAREA-012 depends on.
    expect(Array.isArray(first.focusPoints)).toBe(true)

    rerender(<MMapArea planner={planner} shell={shell} />)

    for (const key of DRAWN) expect(mocks.props[key]).toBe(first[key])
  })

  it('FE-MOB-MAPAREA-018: what is kept still follows the stage, the day colours and the places', () => {
    const planner = stagePlanner(3)
    const shell = buildShell({ view: 'map', mapFront: true, trTab: 'roadtrip' })
    const { rerender } = render(<MMapArea planner={planner} shell={shell} />)
    expect(mocks.props.routeColors).toBeUndefined()

    // Kept on its inputs, not frozen: each one below has to reach the map, or a memo
    // missing it would leave the traveller looking at a stage they already left.
    mocks.prefs = { roadtrip_day_colors: true }
    rerender(<MMapArea planner={planner} shell={shell} />)
    expect(mocks.props.routeColors).toHaveLength(1)

    const renamed = buildPlace({ id: 12, name: 'Travemünde' })
    const edited = { ...planner, mapPlaces: [planner.mapPlaces[0], renamed, planner.mapPlaces[2]] }
    rerender(<MMapArea planner={edited} shell={shell} />)
    expect(mocks.props.places).toContain(renamed)

    const allDays = { ...edited, selectedDayId: null }
    rerender(<MMapArea planner={allDays} shell={shell} />)
    expect(mocks.props.places).toBe(allDays.roadtripMapPlaces)
    expect(mocks.props.focusPoints).toEqual([])

    // Off the tab the stage hands nothing through, so the plan tab frames itself again.
    rerender(<MMapArea planner={allDays} shell={{ ...shell, trTab: 'plan' }} />)
    expect(mocks.props.accessLines).toBeUndefined()
    expect(mocks.props.focusPoints).toBeUndefined()
    expect(mocks.props.places).toBe(allDays.mapPlaces)
  })
})
