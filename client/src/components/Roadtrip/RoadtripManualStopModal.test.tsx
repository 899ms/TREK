import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { TranslationProvider } from '../../i18n'
import type { RoadtripDay, RoadtripRoutes, RoadtripStop } from './useRoadtripRoutes'

const { search } = vi.hoisted(() => ({ search: vi.fn() }))
// Only the place search is replaced; the rest of the module is what the stores around
// this dialog import, and cutting it down breaks them rather than isolating anything.
vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  mapsApi: { search },
}))
// The hint is the trip's own doing and has its own suite; here it only has to arrive.
vi.mock('../../hooks/useLocationBias', () => ({
  useLocationBias: () => ({ point: { lat: 53, lng: 10, radius: 5000 } }),
}))

import RoadtripManualStopModal from './RoadtripManualStopModal'

/** The debounce the dialog waits out before it asks anything. */
const DEBOUNCE = 320

const stop = (id: number, name: string, ownerDayId: number, ownerIndex: number): RoadtripStop => ({
  assignmentId: id,
  ownerDayId,
  ownerIndex,
  placeId: id * 10,
  name,
  lat: 53.5,
  lng: 9.9,
  time: null,
  dwellMinutes: null,
  legMode: null,
  incomingLegMode: null,
  stopType: null,
})

const day = (dayId: number, dayNumber: number, names: string[], routed = true): RoadtripDay => ({
  dayId,
  dayNumber,
  date: null,
  title: null,
  stops: names.map((name, i) => stop(dayId * 10 + i, name, dayId, i)),
  legs: [],
  schedule: { entries: [], warnings: [] },
  legVias: [], driveWarnings: [], dayWarning: null,
  geometry: (routed ? [[53.55, 9.99], [52.52, 13.4]] : []) as [number, number][],
  distance: 0,
  duration: 0,
})

const routes = (days: RoadtripDay[]): RoadtripRoutes => ({
  days,
  lines: [], lineDays: [],
  accessLines: [],
  vias: [],
  segments: [],
  totalDistance: 0,
  totalDuration: 0,
  totalStops: 0,
  quietDays: [],
  loading: false,
})

/** Two routed days, four stops, three legs: each leg named differently. */
const threeLegs = () => routes([
  day(1, 1, ['Hamburg', 'Berlin', 'Dresden']),
  day(2, 2, ['Munich', 'Salzburg']),
])

const hit = (over: Record<string, unknown> = {}) => ({
  name: 'Supercharger Rasthof',
  address: 'A1, Dammer Berge',
  lat: 52.5,
  lng: 8.2,
  osm_id: 'node/9',
  ...over,
})

function setup(over: Partial<React.ComponentProps<typeof RoadtripManualStopModal>> = {}) {
  const onSubmit = vi.fn()
  const onClose = vi.fn()
  const targetFor = vi.fn(() => ({ dayId: 1, position: 2, offRouteKm: 0.4 }))
  render(
    <TranslationProvider>
      <RoadtripManualStopModal
        routes={threeLegs()}
        dayId={1}
        targetFor={targetFor}
        onClose={onClose}
        onSubmit={onSubmit}
        {...over}
      />
    </TranslationProvider>,
  )
  return { onSubmit, onClose, targetFor }
}

/** The place box, by the placeholder every place search in TREK carries. */
const queryBox = () => screen.getByLabelText('Search places...')

/** Type, then wait out the debounce and whatever the answer resolves into. */
async function type(value: string, wait = DEBOUNCE): Promise<void> {
  fireEvent.change(queryBox(), { target: { value } })
  await act(async () => { vi.advanceTimersByTime(wait) })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  search.mockReset()
  search.mockResolvedValue({ places: [hit()], source: 'openstreetmap' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RoadtripManualStopModal', () => {
  it('FE-ROADTRIP-MANUAL-001: two letters are not a question worth asking', async () => {
    // A single common word without a region is refused upstream as too expensive to
    // answer, and asking anyway spends a request to be told so.
    setup()
    await type('Su', DEBOUNCE * 2)

    expect(search).not.toHaveBeenCalled()
  })

  it('FE-ROADTRIP-MANUAL-002: the search waits for a pause in the typing', async () => {
    setup()

    fireEvent.change(queryBox(), { target: { value: 'Supercharger' } })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE - 120) })
    expect(search).not.toHaveBeenCalled()

    await act(async () => { vi.advanceTimersByTime(120) })
    expect(search).toHaveBeenCalledTimes(1)
    // The query, the locale, and the hint that decides which of a thousand identically
    // named places is meant.
    expect(search).toHaveBeenCalledWith('Supercharger', expect.any(String), expect.objectContaining({ lat: 53, lng: 10 }))
  })

  it('FE-ROADTRIP-MANUAL-003: keystroke after keystroke is one question, not one each', async () => {
    setup()

    fireEvent.change(queryBox(), { target: { value: 'Sup' } })
    await act(async () => { vi.advanceTimersByTime(100) })
    fireEvent.change(queryBox(), { target: { value: 'Super' } })
    await act(async () => { vi.advanceTimersByTime(100) })
    fireEvent.change(queryBox(), { target: { value: 'Supercharger' } })
    await act(async () => { vi.advanceTimersByTime(DEBOUNCE) })

    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('Supercharger', expect.any(String), expect.anything())
  })

  it('FE-ROADTRIP-MANUAL-004: a row the map could not place is never offered', async () => {
    // It cannot become a stop, and offering it only to refuse the click is a dead end
    // with nothing to explain it.
    search.mockResolvedValue({
      places: [
        // Nothing at all where a coordinate should be. `Number(null)` is 0, and 0/0 is a
        // real place off the coast of Africa.
        hit({ name: 'Nowhere', lat: null, lng: null }),
        hit({ name: 'Nonsense', lat: 'somewhere', lng: 'thereabouts' }),
        // A row with neither a name nor an address has nothing to show in a list.
        hit({ name: null, address: null }),
        hit(),
      ],
      source: 'openstreetmap',
    })
    setup()
    await type('Supercharger')

    await waitFor(() => expect(screen.getByText('Supercharger Rasthof')).toBeInTheDocument())
    expect(screen.queryByText('Nowhere')).not.toBeInTheDocument()
    expect(screen.queryByText('Nonsense')).not.toBeInTheDocument()
    expect(screen.getAllByText('A1, Dammer Berge')).toHaveLength(1)
  })

  it('FE-ROADTRIP-MANUAL-005: picking one takes the leg the projection worked out', async () => {
    const { onSubmit, targetFor } = setup()
    await type('Supercharger')
    await waitFor(() => expect(screen.getByText('Supercharger Rasthof')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Supercharger Rasthof'))

    // Measured by the planner's own projection, which is also what places a via.
    expect(targetFor).toHaveBeenCalledWith(52.5, 8.2)
    // Day 1, position 2: the leg between its second and third stop.
    expect(screen.getByText('Halfway, Berlin to Dresden')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Supercharger Rasthof', lat: 52.5, lng: 8.2, osm_id: 'node/9' }),
      { dayId: 1, position: 2, offRouteKm: 0.4 },
    )
  })

  it('FE-ROADTRIP-MANUAL-006: the leg it offers can be overruled, and the override is what lands', async () => {
    // A drive that passes the same junction twice can only be guessed at once, and the
    // traveller is the one who knows which time they mean to stop.
    const { onSubmit } = setup()
    await type('Supercharger')
    await waitFor(() => expect(screen.getByText('Supercharger Rasthof')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Supercharger Rasthof'))

    // CustomSelect renders its options into a portal, so the trigger comes first.
    fireEvent.click(screen.getByText('Halfway, Berlin to Dresden'))
    fireEvent.click(screen.getByText('Halfway, Munich to Salzburg'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Supercharger Rasthof' }),
      expect.objectContaining({ dayId: 2, position: 1 }),
    )
  })

  it('FE-ROADTRIP-MANUAL-007: a place well off the road is accepted, and said so rather than refused', async () => {
    // The whole point of the dialog is the charger the corridor search missed, which is
    // exactly the one sitting further off the line than a via would be allowed.
    const targetFor = vi.fn(() => ({ dayId: 2, position: 1, offRouteKm: 12.4 }))
    const { onSubmit } = setup({ targetFor })
    await type('Supercharger')
    await waitFor(() => expect(screen.getByText('Supercharger Rasthof')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Supercharger Rasthof'))

    // A note, not a refusal: found by its tone rather than its wording, which is a
    // translation and not what this test is about.
    expect(document.querySelector('p.text-warning')).toBeInTheDocument()

    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeEnabled()
    fireEvent.click(add)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.anything(),
      { dayId: 2, position: 1, offRouteKm: 12.4 },
    )
  })

  it('FE-ROADTRIP-MANUAL-008: a place on the road is not flagged for being there', async () => {
    setup()
    await type('Supercharger')
    await waitFor(() => expect(screen.getByText('Supercharger Rasthof')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Supercharger Rasthof'))

    expect(document.querySelector('p.text-warning')).toBeNull()
  })

  it('FE-ROADTRIP-MANUAL-009: with nothing routed it goes at the end of the day, and names no leg', async () => {
    const unrouted = routes([day(5, 3, ['Hamburg', 'Berlin'], false)])
    const targetFor = vi.fn(() => null)
    const { onSubmit } = setup({ routes: unrouted, dayId: 5, targetFor })
    await type('Supercharger')
    await waitFor(() => expect(screen.getByText('Supercharger Rasthof')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Supercharger Rasthof'))

    // No drive means no order, and a leg offered anyway would be an invention.
    expect(screen.queryByText(/Halfway,/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.anything(),
      { dayId: 5, position: 2, offRouteKm: 0 },
    )
  })

  it('FE-ROADTRIP-MANUAL-010: nothing can be added until a place has been picked', async () => {
    const { onSubmit, onClose } = setup()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('FE-ROADTRIP-MANUAL-011: a search that fails says nothing was found rather than nothing at all', async () => {
    search.mockRejectedValue(new Error('offline'))
    setup()
    await type('Supercharger')

    // The rejection is swallowed on purpose (it is a typeahead, not a submit), but the
    // list has to stop saying it is loading.
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })
})
