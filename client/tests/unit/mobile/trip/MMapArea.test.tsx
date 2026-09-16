import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '../../../helpers/render'
import { buildPlanner, buildShell } from '../../../helpers/mobileTrip'
import type { MTripShellApi, TripPlanner } from '../../../../src/mobile/screens/trip/MTripShell'
import type { CompassMap } from '../../../../src/components/Map/MapCompassPill'
import { useSettingsStore } from '../../../../src/store/settingsStore'

// FE-MOB-MAPAREA-001 to FE-MOB-MAPAREA-014

const mocks = vi.hoisted(() => ({
  poi: {} as Record<string, unknown>,
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

beforeEach(() => {
  mocks.glMap = COMPASS
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
    expect(compassBand(container)?.className).toContain('left-3')
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
})
