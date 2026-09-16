import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '../../../helpers/render'
import { buildPlanner, buildShell } from '../../../helpers/mobileTrip'
import MRoadtripTab from '../../../../src/mobile/screens/trip/roadtrip/MRoadtripTab'
import type { MTripShellApi, TripPlanner } from '../../../../src/mobile/screens/trip/MTripShell'
import type { Day, Place } from '../../../../src/types'
import type { RoadtripDay, RoadtripRoutes, RouteSegment } from '@trek/shared/roadtrip'

// FE-MOB-RTTAB-001 to FE-MOB-RTTAB-034

// The preference store is a zustand slice keyed by user and trip; the tab only ever
// reads two flags out of it, so the hook is the smaller seam.
const mocks = vi.hoisted(() => ({
  prefs: {} as Record<string, unknown>,
  swipe: {} as { onSelectDay: (id: number) => void; describeDay: (i: number, n: number) => string },
}))

vi.mock('../../../../src/hooks/useRoadtripSettings', () => ({
  useRoadtripSettings: (select: (p: Record<string, unknown>) => unknown) => select(mocks.prefs),
}))

// The swipe itself is the plan tab's, tested there; this keeps the real hook and only
// records what the road trip tab hands it.
vi.mock('../../../../src/mobile/screens/trip/plan/useMPlanDaySwipe', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../../src/mobile/screens/trip/plan/useMPlanDaySwipe')>()
  return {
    ...actual,
    useMPlanDaySwipe: (config: Parameters<typeof actual.useMPlanDaySwipe>[0]) => {
      mocks.swipe = config as unknown as typeof mocks.swipe
      return actual.useMPlanDaySwipe(config)
    },
  }
})

const DAYS = [
  { id: 1, trip_id: 7, day_number: 1, date: '2026-05-01', title: null },
  { id: 2, trip_id: 7, day_number: 2, date: '2026-05-02', title: null },
] as unknown as Day[]

const PLACES = [
  { id: 101, trip_id: 7, name: 'Fuji Viewpoint', lat: 35.36, lng: 138.73 },
  { id: 103, trip_id: 7, name: 'Kyoto Station', lat: 34.98, lng: 135.75 },
] as unknown as Place[]

const seg = (distanceText: string, durationText: string): RouteSegment => ({
  mid: [35.4, 138.6], from: [35.7, 139.8], to: [34.98, 135.75],
  distance: 210_000, duration: 9_600,
  walkingText: '42 h', drivingText: durationText, distanceText, durationText,
})

/**
 * One stage with all five row kinds on it.
 *
 * The first stop is stored on day 1: it was reached after midnight, so it is drawn on
 * this card behind a spill band while still belonging to the day before. That is the
 * case the sheet id has to survive.
 */
function stage(over: Partial<RoadtripDay> = {}): RoadtripDay {
  return {
    dayId: 2,
    dayNumber: 2,
    date: '2026-05-02',
    title: null,
    stops: [
      {
        assignmentId: 501, ownerDayId: 1, ownerIndex: 3, placeId: 101, name: 'Fuji Viewpoint',
        lat: 35.36, lng: 138.73, time: null, dwellMinutes: 45,
        legMode: null, incomingLegMode: null, stopType: null,
      },
      {
        assignmentId: 502, ownerDayId: 2, ownerIndex: 0, placeId: 102, name: 'Shell Ebina',
        lat: 35.44, lng: 139.39, time: null, dwellMinutes: 10,
        legMode: null, incomingLegMode: null, stopType: 'fuel',
      },
      {
        assignmentId: 503, ownerDayId: 2, ownerIndex: 1, placeId: 103, name: 'Kyoto Station',
        lat: 34.98, lng: 135.75, time: null, dwellMinutes: null,
        legMode: null, incomingLegMode: null, stopType: null,
      },
      {
        assignmentId: 504, ownerDayId: 2, ownerIndex: 2, placeId: 104, name: 'Day end',
        lat: 34.9, lng: 135.7, time: null, dwellMinutes: null,
        legMode: null, incomingLegMode: null, stopType: null,
        automaticNight: { phase: 'end', fromDayNumber: 2 },
      },
    ],
    legs: [seg('62 km', '1 h'), seg('210 km', '2 h 40 min'), undefined],
    schedule: {
      entries: [
        { arrival: '08:30', departure: '09:15', anchored: true, dayOffset: 0 },
        { arrival: '10:05', departure: '10:15', anchored: false, dayOffset: 0 },
        { arrival: '12:40', departure: null, anchored: false, dayOffset: 0 },
        { arrival: '22:00', departure: null, anchored: false, dayOffset: 0 },
      ],
      warnings: [],
    },
    legVias: [[], [], []],
    geometry: [],
    distance: 412_000,
    duration: 18_000,
    driveWarnings: [{ index: 2, code: 'late', minutes: 25 }],
    dayWarning: null,
    spills: [{ at: 0, count: 1, fromDayNumber: 1, departure: '23:10', leg: undefined }],
    dryPoints: [{ legIndex: 1, intoLegKm: 82, drivenMeters: 82_000, sinceKm: 520, lat: 35.2, lng: 137.5 }],
    ...over,
  } as unknown as RoadtripDay
}

function routes(over: Partial<RoadtripRoutes> = {}): RoadtripRoutes {
  return {
    days: [stage()],
    quietDays: [], lines: [], lineDays: [], accessLines: [], vias: [], segments: [],
    totalDistance: 980_000, totalDuration: 54_000, totalStops: 4, loading: false,
    ...over,
  } as unknown as RoadtripRoutes
}

function planner(over: Partial<TripPlanner> = {}): TripPlanner {
  return buildPlanner({
    tripId: 7,
    days: DAYS,
    places: PLACES,
    selectedDayId: 2,
    roadtripRoutes: routes(),
    askRefuel: vi.fn(),
    ...over,
  } as Partial<TripPlanner>)
}

function renderTab(p: TripPlanner = planner(), shell: MTripShellApi = buildShell()) {
  const view = render(<MRoadtripTab planner={p} shell={shell} tab="roadtrip" />)
  return { ...view, planner: p, shell }
}

/** Freezes the clock and hands back the stage's own date, whatever the runner's zone. */
function freezeAt(hour: number, minute: number): string {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 4, 2, hour, minute))
  return new Date().toISOString().slice(0, 10)
}

function today(date: string): Partial<TripPlanner> {
  return {
    days: DAYS.map(d => (d.id === 2 ? { ...d, date } : d)) as unknown as Day[],
    roadtripRoutes: routes({ days: [stage({ date })] }),
  }
}

describe('MRoadtripTab', () => {
  beforeEach(() => {
    mocks.prefs = {}
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('list half', () => {
    it('FE-MOB-RTTAB-001: heads the stage with its start, its arrival, the day total and the stop count', () => {
      renderTab()

      // The start is the first stop's ARRIVAL (08:30), the clock its row prints, not its
      // departure (09:15). Nor is it the spill band's 23:10: that one belongs to the day before.
      const start = screen.getByText('mobileTrip.rtStart').parentElement as HTMLElement
      expect(within(start).getByText('08:30')).toBeInTheDocument()
      expect(within(start).queryByText('09:15')).toBeNull()
      expect(within(start).queryByText('23:10')).toBeNull()
      const arrive = screen.getByText('roadtrip.stay.arrive').parentElement as HTMLElement
      expect(within(arrive).getByText('12:40')).toBeInTheDocument()
      // Both clocks keep their digit order in an RTL locale, like the ones on the rows.
      expect(within(start).getByText('08:30')).toHaveAttribute('dir', 'ltr')
      expect(within(arrive).getByText('12:40')).toHaveAttribute('dir', 'ltr')

      expect(screen.getByText('roadtrip.leg.driveText:412 km,5 h')).toBeInTheDocument()
      expect(screen.getByText('roadtrip.day.stopCount:2')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-002: dates the head card, and falls back to the day number without a date', () => {
      renderTab()
      expect(screen.getByText(/May 2/)).toBeInTheDocument()

      const undated = planner({ days: DAYS.map(d => ({ ...d, date: null })) as unknown as Day[] })
      const second = render(<MRoadtripTab planner={undated} shell={buildShell()} tab="roadtrip" />)
      expect(within(second.container).getByText('roadtrip.day:2')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-003: draws one row per stop, in the order of the model', () => {
      renderTab()

      const names = screen.getAllByText(/^(Fuji Viewpoint|Shell Ebina|Kyoto Station)$/).map(n => n.textContent)
      expect(names).toEqual(['Fuji Viewpoint', 'Shell Ebina', 'Kyoto Station'])
      // The petrol stop takes no number, so the destination after it is still 2.
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.queryByText('3')).toBeNull()
      // And the automatic night is a band, not a stop.
      expect(screen.queryByText('Day end')).toBeNull()
      expect(screen.getByText('roadtrip.window.stop')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-004: opens a stop on the day it is stored on, not the card it is drawn on', () => {
      const { shell } = renderTab()

      fireEvent.click(screen.getByText('Fuji Viewpoint'))

      expect(shell.openSheet).toHaveBeenCalledWith('rtstop', { dayId: 1, assignmentId: 501 })
    })

    it('FE-MOB-RTTAB-005: opens a stop of this day with this day', () => {
      const { shell } = renderTab()

      fireEvent.click(screen.getByText('Kyoto Station'))

      expect(shell.openSheet).toHaveBeenCalledWith('rtstop', { dayId: 2, assignmentId: 503 })
    })

    it('FE-MOB-RTTAB-006: writes the day warning out with the sentence the desktop hides in a tooltip', () => {
      const over = stage({ dayWarning: { code: 'dayDriving', minutes: 620, limitMinutes: 540 } })
      renderTab(planner({ roadtripRoutes: routes({ days: [over] }) }))

      expect(screen.getByText('roadtrip.limit.dayOver:1 h 20 min')).toBeInTheDocument()
      expect(screen.getByText('roadtrip.limit.hint')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-007: leaves the day warning off a stage that stays inside its limit', () => {
      renderTab()

      expect(screen.queryByText(/roadtrip\.limit\.dayOver/)).toBeNull()
      expect(screen.queryByText('roadtrip.limit.hint')).toBeNull()
    })

    it('FE-MOB-RTTAB-008: shows the empty stage without a summary card full of zeroes', () => {
      renderTab(planner({ roadtripRoutes: routes({ days: [] }) }))

      expect(screen.getByText('roadtrip.empty.title')).toBeInTheDocument()
      expect(screen.getByText('mobileTrip.rtPlanOnDesktop')).toBeInTheDocument()
      expect(screen.queryByText('mobileTrip.rtStart')).toBeNull()
      expect(screen.queryByText(/roadtrip\.day\.stopCount/)).toBeNull()
    })

    it('FE-MOB-RTTAB-009: shows the partial hint instead of the empty state while the round is still running', () => {
      renderTab(planner({ roadtripRoutes: routes({ days: [], loading: true }) }))

      expect(screen.getByText('roadtrip.summary.partial')).toBeInTheDocument()
      expect(screen.queryByText('roadtrip.empty.title')).toBeNull()
      expect(screen.queryByText('mobileTrip.rtPlanOnDesktop')).toBeNull()
    })

    it('FE-MOB-RTTAB-010: paints the day tint only once the day colours are on', () => {
      const plain = renderTab()
      expect(plain.container.querySelector('span.h-2.w-2.rounded-full')).toBeNull()
      plain.unmount()

      mocks.prefs = { roadtrip_day_colors: true }
      const tinted = renderTab()
      const dot = tinted.container.querySelector('span.h-2.w-2.rounded-full') as HTMLElement
      // dayColor(2).line, the second of the eight, see dayColors.ts.
      expect(dot).toHaveStyle({ background: '#ff9f0a' })
    })

    it('FE-MOB-RTTAB-011: dashes the two figures for a stage the routing could not time', () => {
      const untimed = stage({
        schedule: { entries: [0, 1, 2, 3].map(() => ({ arrival: null, departure: null, anchored: false, dayOffset: 0 })), warnings: [] },
      } as unknown as Partial<RoadtripDay>)
      renderTab(planner({ roadtripRoutes: routes({ days: [untimed] }) }))

      const start = screen.getByText('mobileTrip.rtStart').parentElement as HTMLElement
      expect(within(start).getByText('-')).toBeInTheDocument()
      const arrive = screen.getByText('roadtrip.stay.arrive').parentElement as HTMLElement
      expect(within(arrive).getByText('-')).toBeInTheDocument()
      // The chain itself still stands, it just carries no clocks.
      expect(screen.getByText('Kyoto Station')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-012: says the day total is still partial while the distance is zero', () => {
      renderTab(planner({ roadtripRoutes: routes({ days: [stage({ distance: 0 })] }) }))

      expect(screen.getByText('roadtrip.summary.partial')).toBeInTheDocument()
      expect(screen.queryByText(/roadtrip\.leg\.driveText:412/)).toBeNull()
    })

    it('FE-MOB-RTTAB-032: heads the card with the clock the first row prints, not the end of its stay', () => {
      // The reported stage: Hamburg Speicherstadt pinned at 10:00 with an hour and a half
      // there, Sanssouci reached at 19:33. The card used to read LEAVE 11:30, a clock no row
      // shows, which hid the pinned appointment behind its own stay.
      const reported = stage({
        spills: [],
        stops: [
          {
            assignmentId: 601, ownerDayId: 2, ownerIndex: 0, placeId: 201, name: 'Hamburg Speicherstadt',
            lat: 53.54, lng: 9.99, time: '10:00', dwellMinutes: 90,
            legMode: null, incomingLegMode: null, stopType: null,
          },
          {
            assignmentId: 602, ownerDayId: 2, ownerIndex: 1, placeId: 202, name: 'Sanssouci Palace',
            lat: 52.4, lng: 13.04, time: null, dwellMinutes: 120,
            legMode: null, incomingLegMode: null, stopType: null,
          },
        ],
        legs: [seg('290 km', '3 h')],
        legVias: [[]],
        schedule: {
          entries: [
            { arrival: '10:00', departure: '11:30', anchored: true, dayOffset: 0 },
            { arrival: '19:33', departure: '21:33', anchored: false, dayOffset: 0 },
          ],
          warnings: [],
        },
        dryPoints: [],
        driveWarnings: [],
      } as unknown as Partial<RoadtripDay>)
      renderTab(planner({ roadtripRoutes: routes({ days: [reported] }) }))

      const start = screen.getByText('mobileTrip.rtStart').parentElement as HTMLElement
      expect(within(start).getByText('10:00')).toBeInTheDocument()
      const arrive = screen.getByText('roadtrip.stay.arrive').parentElement as HTMLElement
      expect(within(arrive).getByText('19:33')).toBeInTheDocument()
      // Neither departure is printed anywhere on the screen, and the word for one is gone.
      expect(screen.queryByText('11:30')).toBeNull()
      expect(screen.queryByText('21:33')).toBeNull()
      expect(screen.queryByText('roadtrip.stay.leave')).toBeNull()
      // The figure is the very clock the first row carries.
      const firstRow = screen.getByText('Hamburg Speicherstadt').closest('[role=button]') as HTMLElement
      expect(within(firstRow).getByText('10:00')).toBeInTheDocument()
    })
  })

  describe('up next', () => {
    it('FE-MOB-RTTAB-013: counts down to the next stop still ahead, on the day it actually is', () => {
      const date = freezeAt(7, 0)
      renderTab(planner(today(date)))

      const card = screen.getByText('mobileTrip.upNext').closest('section') as HTMLElement
      expect(within(card).getByText('Fuji Viewpoint')).toBeInTheDocument()
      expect(within(card).getByText('mobileTrip.inCountdown:1 h 30 min')).toBeInTheDocument()
      expect(within(card).getByText('08:30')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-014: shows no countdown on a day that is not today', () => {
      const date = freezeAt(7, 0)
      const shifted = new Date(`${date}T00:00:00Z`)
      shifted.setUTCDate(shifted.getUTCDate() + 7)
      renderTab(planner(today(shifted.toISOString().slice(0, 10))))

      // Same clock, same stage, a week further on: the countdown is about the date.
      expect(screen.queryByText('mobileTrip.upNext')).toBeNull()
      expect(screen.getByText('mobileTrip.rtStart')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-015: shows no countdown once the last stop is behind you', () => {
      const date = freezeAt(23, 30)
      renderTab(planner(today(date)))

      expect(screen.queryByText('mobileTrip.upNext')).toBeNull()
    })

    it('FE-MOB-RTTAB-016: opens the stop from the countdown card', () => {
      const date = freezeAt(7, 0)
      const { shell } = renderTab(planner(today(date)))

      fireEvent.click(screen.getByText('mobileTrip.upNext'))

      expect(shell.openSheet).toHaveBeenCalledWith('rtstop', { dayId: 1, assignmentId: 501 })
    })

    it('FE-MOB-RTTAB-017: shows the next stop on the map half by moving the camera, not the place selection', () => {
      const date = freezeAt(7, 0)
      const p = planner(today(date))
      const { shell } = renderTab(p)

      fireEvent.click(screen.getByLabelText('mobileTrip.showOnMap'))

      expect(p.focusRoadtripPoint).toHaveBeenCalledWith(35.36, 138.73)
      expect(shell.toggleRtView).toHaveBeenCalledTimes(1)
      // The place inspector opens off the selection and would come up over the stage.
      expect(p.setSelectedPlaceId).not.toHaveBeenCalled()
      // Up next is always a stop of the stage on screen, so the day stays where it is.
      expect(p.handleSelectDay).not.toHaveBeenCalled()
    })

    it('FE-MOB-RTTAB-018: leaves the navigate link dead when the stop has no place row behind it', () => {
      const date = freezeAt(7, 0)
      const enabled = renderTab(planner(today(date)))
      expect(screen.getByText('places.navigate').closest('a')).toHaveAttribute('aria-disabled', 'false')
      enabled.unmount()

      renderTab(planner({ ...today(date), places: [] }))
      const link = screen.getByText('places.navigate').closest('a') as HTMLElement
      expect(link).toHaveAttribute('aria-disabled', 'true')
      expect(link).toHaveAttribute('href', '#')
    })
  })

  describe('refuel', () => {
    it('FE-MOB-RTTAB-019: asks for a refuel with the dry point of the leg the band sits on', () => {
      const p = planner()
      renderTab(p)

      fireEvent.click(screen.getByRole('button', { name: 'roadtrip.refuel.find' }))

      expect(p.askRefuel).toHaveBeenCalledWith(2, expect.objectContaining({ legIndex: 1, intoLegKm: 82 }))
    })

    it('FE-MOB-RTTAB-020: offers no refuel search to a member who cannot edit the day', () => {
      renderTab(planner({ can: vi.fn(() => false) }))

      expect(screen.getByText('roadtrip.refuel.dry')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'roadtrip.refuel.find' })).toBeNull()
    })

    it('FE-MOB-RTTAB-021: reads the vehicle out of the trip preferences', () => {
      mocks.prefs = { roadtrip_vehicle: 'electric' }
      renderTab()

      expect(screen.getByText('roadtrip.refuel.dryElectric')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'roadtrip.refuel.findElectric' })).toBeInTheDocument()
    })
  })

  describe('map half', () => {
    const mapShell = () => buildShell({ rtView: 'map' })

    it('FE-MOB-RTTAB-022: renders the stage bar and nothing that would cover the map', () => {
      const { container } = renderTab(planner(), mapShell())

      expect((container.firstChild as HTMLElement).className).toContain('pointer-events-none')
      expect(screen.queryByText('mobileTrip.rtStart')).toBeNull()
      expect(screen.queryByText('Shell Ebina')).toBeNull()
      expect(screen.queryByText('roadtrip.refuel.dry')).toBeNull()
      expect(screen.queryByText('roadtrip.window.stop')).toBeNull()
    })

    it('FE-MOB-RTTAB-023: names the last stop of the day, its count, that stop\'s own arrival and the distance', () => {
      renderTab(planner(), mapShell())

      const bar = screen.getByRole('button', { name: /Kyoto Station/ })
      expect(within(bar).getByText('Kyoto Station')).toBeInTheDocument()
      // 12:40 is when Kyoto Station is reached. The bar used to print 22:00, the automatic
      // day end after it, which is where the window closed and not a clock of the stop named.
      expect(within(bar).getByText('roadtrip.day.stopCount:2 · 12:40')).toBeInTheDocument()
      expect(within(bar).queryByText(/22:00/)).toBeNull()
      expect(within(bar).getByText('412 km')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-024: drops the arrival from the bar when the day has none, and the pending distance with it', () => {
      const untimed = stage({
        distance: 0,
        schedule: { entries: [0, 1, 2, 3].map(() => ({ arrival: null, departure: null, anchored: false, dayOffset: 0 })), warnings: [] },
      } as unknown as Partial<RoadtripDay>)
      renderTab(planner({ roadtripRoutes: routes({ days: [untimed] }) }), mapShell())

      const bar = screen.getByRole('button', { name: /roadtrip.leg.pending/ })
      expect(within(bar).getByText('roadtrip.day.stopCount:2')).toBeInTheDocument()
      expect(within(bar).getByText('roadtrip.leg.pending')).toBeInTheDocument()
    })

    it('FE-MOB-RTTAB-025: opens the stop the bar names, the sheet its row in the chain opens', () => {
      const { shell } = renderTab(planner(), mapShell())

      fireEvent.click(screen.getByRole('button', { name: /Kyoto Station/ }))

      expect(shell.openSheet).toHaveBeenCalledWith('rtstop', { dayId: 2, assignmentId: 503 })
      // The bar reads as a place; the header's list switch is the way back to the chain.
      expect(shell.toggleRtView).not.toHaveBeenCalled()
    })

    it('FE-MOB-RTTAB-033: a stage drawn with nothing but its night marker names no stop and is not a button', () => {
      const nightOnly = stage({
        stops: [stage().stops[3]],
        legs: [],
        legVias: [],
        spills: [],
        dryPoints: [],
        driveWarnings: [],
        schedule: { entries: [{ arrival: '22:00', departure: null, anchored: false, dayOffset: 0 }], warnings: [] },
      } as unknown as Partial<RoadtripDay>)
      const { shell } = renderTab(planner({ roadtripRoutes: routes({ days: [nightOnly] }) }), mapShell())

      const title = screen.getByText('roadtrip.stop.none')
      // Nothing for a tap to open, so a plain block rather than a dead button, and the night
      // marker's clock is not a stop's arrival either.
      expect(title.closest('button')).toBeNull()
      expect(screen.getByText('roadtrip.day.stopCount:0')).toBeInTheDocument()
      expect(screen.queryByText(/22:00/)).toBeNull()
      fireEvent.click(title)
      expect(shell.openSheet).not.toHaveBeenCalled()
      expect(shell.toggleRtView).not.toHaveBeenCalled()
    })

    it('FE-MOB-RTTAB-034: a stage that ends on a stop reached after midnight opens it on the day it is stored on', () => {
      // Only the spilled stop is left on the card: it is drawn here and stored on day 1.
      const spilledOnly = stage({
        stops: [stage().stops[0]],
        legs: [],
        legVias: [],
        dryPoints: [],
        driveWarnings: [],
        schedule: { entries: [{ arrival: '00:40', departure: '01:25', anchored: false, dayOffset: 0 }], warnings: [] },
      } as unknown as Partial<RoadtripDay>)
      const { shell } = renderTab(planner({ roadtripRoutes: routes({ days: [spilledOnly] }) }), mapShell())

      const bar = screen.getByRole('button', { name: /Fuji Viewpoint/ })
      expect(within(bar).getByText('roadtrip.day.stopCount:1 · 00:40')).toBeInTheDocument()
      fireEvent.click(bar)
      expect(shell.openSheet).toHaveBeenCalledWith('rtstop', { dayId: 1, assignmentId: 501 })
    })

    it('FE-MOB-RTTAB-026: falls back to the whole drive when no day is picked, and offers nothing to tap', () => {
      renderTab(planner({ selectedDayId: null }), mapShell())

      expect(screen.getByText('roadtrip.title')).toBeInTheDocument()
      expect(screen.getByText('980 km')).toBeInTheDocument()
      // Not a dead button: with no stage there is nothing for a tap to open, so the
      // whole-drive line is a plain block. The search bar above it stays a button.
      expect(screen.getByText('roadtrip.title').closest('button')).toBeNull()
    })
  })

  describe('the corridor search', () => {
    const mapShell = () => buildShell({ rtView: 'map' })

    it('FE-MOB-RTTAB-028: the search bar stands in the same band on both halves', () => {
      const list = renderTab()
      const inList = screen.getByText('roadtrip.poi.title').closest('div[class*="top-[calc"]')
      expect(inList).not.toBeNull()
      list.unmount()

      renderTab(planner(), mapShell())
      const onMap = screen.getByText('roadtrip.poi.title').closest('div[class*="top-[calc"]')
      // Literally the same offset: one stage seen two ways, and a control that jumps
      // between them is a control you have to find twice.
      expect(onMap?.className).toBe(inList?.className)
    })

    it('FE-MOB-RTTAB-029: it opens the search sheet', () => {
      const { shell } = renderTab()

      fireEvent.click(screen.getByText('roadtrip.poi.title'))
      expect(shell.openSheet).toHaveBeenCalledWith('rtsearch')
    })

    it('FE-MOB-RTTAB-030: the chain starts below the bar rather than under it', () => {
      const { container } = renderTab()

      const scroller = container.querySelector('[class*="overflow-y-auto"]') as HTMLElement
      // 96px band plus a 44px bar plus its gap. A padding left at the old 102 would
      // put the head card's first line behind the glass.
      expect(scroller.className).toContain('pt-[calc(var(--m-safe-top,12px)+150px)]')
    })
    it('FE-MOB-RTTAB-031: no stage, no search bar, and the chain keeps its old top', () => {
      // Without a stage the corridor falls back to the trip's first routed day, which
      // is not the one on screen: every distance it answered with would be measured
      // against a road nobody is looking at.
      const { container } = renderTab(planner({ selectedDayId: null }))

      expect(screen.queryByText('roadtrip.poi.title')).toBeNull()
      const scroller = container.querySelector('[class*="overflow-y-auto"]') as HTMLElement
      expect(scroller.className).toContain('pt-[calc(var(--m-safe-top,12px)+102px)]')
    })
  })

  describe('day swipe', () => {
    it('FE-MOB-RTTAB-027: steps the stage without refitting the map, and announces the day it landed on', () => {
      const p = planner()
      renderTab(p)

      mocks.swipe.onSelectDay(1)

      // The second argument is skipFit: the map stays where it is, the stage's own
      // focus points frame it.
      expect(p.handleSelectDay).toHaveBeenCalledWith(1, true)
      expect(mocks.swipe.describeDay(0, 2)).toBe('mobileTrip.dayAnnounce:1,2')
    })
  })
})
