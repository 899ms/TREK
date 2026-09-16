import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../../helpers/render'
import {
  RtAutoRow, RtDryRow, RtLegRow, RtSpillRow, RtStopRow, type RowChrome,
} from '../../../../src/mobile/screens/trip/roadtrip/MRoadtripRows'
import type { StopRow } from '../../../../src/components/Roadtrip/roadtripRowModel'
import type { RouteSegment, ScheduleWarning } from '@trek/shared/roadtrip'
import type { TranslationFn } from '../../../../src/types'
import type { RefuelSearch } from '../../../../src/components/Roadtrip/useRefuelSearch'
import type { RefuelCandidate } from '../../../../src/components/Roadtrip/refuelSuggestion'

// FE-MOB-RTROW-001 to FE-MOB-RTROW-030

// Same echo strategy as tests/helpers/mobileTrip: assertions stay on keys, not copy.
const t: TranslationFn = (key, params) =>
  params ? `${key}:${Object.values(params).join(',')}` : key

const chrome: RowChrome = { t, unit: 'metric' }

function stopRow(over: Partial<StopRow> = {}): StopRow {
  return {
    kind: 'stop',
    stop: {
      assignmentId: 501, ownerDayId: 2, ownerIndex: 0, placeId: 101,
      name: 'Kyoto Station', lat: 34.98, lng: 135.75,
      time: null, dwellMinutes: null, legMode: null, incomingLegMode: null, stopType: null,
    },
    number: 2,
    service: false,
    entry: undefined,
    time: '12:40',
    pinned: false,
    warning: null,
    dwellMinutes: null,
    offRoadMeters: null,
    ...over,
  } as StopRow
}

const SEG: RouteSegment = {
  mid: [35.4, 138.6], from: [35.7, 139.8], to: [34.98, 135.75],
  distance: 210_000, duration: 9_600,
  // The two differ on purpose: durationText is the routed time, drivingText the
  // fallback the older segments carry.
  walkingText: '42 h', drivingText: '2 h 55 min', distanceText: '210 km', durationText: '2 h 40 min',
}

describe('RtStopRow', () => {
  it('FE-MOB-RTROW-001: gives a destination its number and no kind icon', () => {
    const { container } = render(<RtStopRow row={stopRow()} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(container.querySelector('.lucide-fuel')).toBeNull()
  })

  it('FE-MOB-RTROW-002: gives a service stop its kind symbol in the kind colour instead of a number', () => {
    const { container } = render(
      <RtStopRow
        row={stopRow({
          number: null,
          service: true,
          stop: { ...stopRow().stop, name: 'Shell Ebina', stopType: 'fuel' },
        })}
        chrome={chrome}
        onOpen={vi.fn()}
      />,
    )

    const disc = container.querySelector('.lucide-fuel')?.parentElement as HTMLElement
    expect(disc).toBeTruthy()
    // #E8590C is SERVICE_COLORS.fuel, the colour the stop wears on the map too.
    expect(disc).toHaveStyle({ background: '#E8590C' })
    expect(screen.queryByText('2')).toBeNull()
  })

  it('FE-MOB-RTROW-003: keeps at most two marks, a dwell and a warning push the road distance out', () => {
    const { container } = render(
      <RtStopRow
        row={stopRow({
          dwellMinutes: 45,
          warning: { index: 1, code: 'late', minutes: 25 },
          offRoadMeters: 120,
        })}
        chrome={chrome}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText('+25 min')).toBeInTheDocument()
    expect(screen.queryByText('120 m')).toBeNull()
    expect(container.querySelector('.lucide-footprints')).toBeNull()
  })

  it('FE-MOB-RTROW-004: shows the road distance only when the row has neither dwell nor warning', () => {
    render(<RtStopRow row={stopRow({ offRoadMeters: 120 })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByText('120 m')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-005: gives a pinned time the pin and the full colour', () => {
    render(<RtStopRow row={stopRow({ pinned: true })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByLabelText('roadtrip.stop.pinned')).toBeInTheDocument()
    expect(screen.getByText('12:40').className).toContain('text-m-ink')
  })

  it('FE-MOB-RTROW-006: leaves a computed time unpinned and muted', () => {
    render(<RtStopRow row={stopRow()} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.queryByLabelText('roadtrip.stop.pinned')).toBeNull()
    const time = screen.getByText('12:40')
    expect(time.className).toContain('text-m-faint')
    expect(time.className).not.toContain('text-m-ink')
  })

  it('FE-MOB-RTROW-007: prints no clock for a stop the schedule could not time', () => {
    render(<RtStopRow row={stopRow({ time: null })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.queryByText('12:40')).toBeNull()
    expect(screen.getByText('Kyoto Station')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-008: opens the stop on a tap and on the keyboard', () => {
    const onOpen = vi.fn()
    render(<RtStopRow row={stopRow()} chrome={chrome} onOpen={onOpen} />)

    const row = screen.getByRole('button')
    fireEvent.click(row)
    expect(onOpen).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(row, { key: ' ' })
    expect(onOpen).toHaveBeenCalledTimes(3)
  })

  it('FE-MOB-RTROW-009: ignores a key press that came from something inside the row', () => {
    const onOpen = vi.fn()
    render(<RtStopRow row={stopRow()} chrome={chrome} onOpen={onOpen} />)

    fireEvent.keyDown(screen.getByText('Kyoto Station'), { key: 'Enter' })

    expect(onOpen).not.toHaveBeenCalled()
  })

  it('FE-MOB-RTROW-010: writes a late warning as the minutes it costs', () => {
    const warning: ScheduleWarning = { index: 1, code: 'late', minutes: 25 }
    const { container } = render(<RtStopRow row={stopRow({ warning })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByText('+25 min')).toBeInTheDocument()
    expect(container.querySelector('.lucide-alert-triangle')).not.toBeNull()
  })

  it('FE-MOB-RTROW-011: writes a range warning as the distance driven since the last fill', () => {
    const warning: ScheduleWarning = { index: 1, code: 'range', sinceKm: 520 }
    const { container } = render(<RtStopRow row={stopRow({ warning })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByText('520 km')).toBeInTheDocument()
    expect(container.querySelector('.lucide-fuel')).not.toBeNull()
  })

  it('FE-MOB-RTROW-012: writes a leg warning as the time it runs over', () => {
    const warning: ScheduleWarning = { index: 1, code: 'leg', overMinutes: 35 }
    render(<RtStopRow row={stopRow({ warning })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByText('35 min')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-013: writes an overnight warning as a word, since it has no figure', () => {
    const warning: ScheduleWarning = { index: 1, code: 'overnight' }
    const { container } = render(<RtStopRow row={stopRow({ warning })} chrome={chrome} onOpen={vi.fn()} />)

    expect(screen.getByText('roadtrip.warn.overnight')).toBeInTheDocument()
    expect(container.querySelector('.lucide-moon')).not.toBeNull()
  })
})

describe('RtLegRow', () => {
  it('FE-MOB-RTROW-014: is not a control, no button, no role, nothing focusable', () => {
    const { container } = render(<RtLegRow seg={SEG} mode="driving" chrome={chrome} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('[role]')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
  })

  it('FE-MOB-RTROW-015: prints the drive and the car icon for a routed leg, falling back to the driving text', () => {
    const bare = render(<RtLegRow seg={{ ...SEG, durationText: undefined }} mode="driving" chrome={chrome} />)
    expect(screen.getByText('roadtrip.leg.driveText:210 km,2 h 55 min')).toBeInTheDocument()
    bare.unmount()

    const { container } = render(<RtLegRow seg={SEG} mode="driving" chrome={chrome} />)

    expect(screen.getByText('roadtrip.leg.driveText:210 km,2 h 40 min')).toBeInTheDocument()
    expect(container.querySelector('.lucide-car-front')).not.toBeNull()
  })

  it('FE-MOB-RTROW-016: says the leg is pending while no segment has come back', () => {
    render(<RtLegRow seg={undefined} mode="driving" chrome={chrome} />)

    expect(screen.getByText('roadtrip.leg.pending')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-017: swaps the icon for a walked leg and for a plugin mode', () => {
    const walk = render(<RtLegRow seg={SEG} mode="walking" chrome={chrome} />)
    expect(walk.container.querySelector('.lucide-footprints')).not.toBeNull()
    walk.unmount()

    const plugin = render(<RtLegRow seg={SEG} mode="plugin:rail" chrome={chrome} />)
    expect(plugin.container.querySelector('.lucide-zap')).not.toBeNull()
  })
})

describe('RtDryRow', () => {
  const idle = {
    openFor: null, loading: false, outcome: null, results: [], offered: [],
    ask: vi.fn(), close: vi.fn(),
  } as unknown as RefuelSearch
  const props = { intoLegKm: 82, chrome, electric: false, offline: false, refuel: idle, dayId: 7, legIndex: 1 }

  it('FE-MOB-RTROW-018: names the fuel wording and the distance into the leg for a combustion car', () => {
    render(<RtDryRow {...props} onSearch={vi.fn()} />)

    expect(screen.getByText('roadtrip.refuel.dry')).toBeInTheDocument()
    expect(screen.getByText('roadtrip.refuel.after:82 km')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'roadtrip.refuel.find' })).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-019: swaps to the charging wording for an electric car', () => {
    render(<RtDryRow {...props} electric onSearch={vi.fn()} />)

    expect(screen.getByText('roadtrip.refuel.dryElectric')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'roadtrip.refuel.findElectric' })).toBeInTheDocument()
    expect(screen.queryByText('roadtrip.refuel.dry')).toBeNull()
  })

  it('FE-MOB-RTROW-020: searches from the button', () => {
    const onSearch = vi.fn()
    render(<RtDryRow {...props} onSearch={onSearch} />)

    fireEvent.click(screen.getByRole('button', { name: 'roadtrip.refuel.find' }))
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('FE-MOB-RTROW-021: disables the search offline and says why underneath it', () => {
    const onSearch = vi.fn()
    render(<RtDryRow {...props} offline onSearch={onSearch} />)

    const button = screen.getByRole('button', { name: 'roadtrip.refuel.find' })
    expect(button).toBeDisabled()
    expect(screen.getByText('mobileTrip.rtSearchOffline')).toBeInTheDocument()

    fireEvent.click(button)
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('FE-MOB-RTROW-022: drops the button entirely without write permission, offline line included', () => {
    render(<RtDryRow {...props} offline />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('mobileTrip.rtSearchOffline')).toBeNull()
    // The warning itself stays: it is information, not an action.
    expect(screen.getByText('roadtrip.refuel.dry')).toBeInTheDocument()
  })
  const offer = (over: Record<string, unknown> = {}) => ({
    osm_id: 'n1', name: 'Shell Ebina', lat: 35.44, lng: 139.39, category: 'fuel',
    poi_type: 'amenity=fuel', address: null, website: null, phone: null,
    opening_hours: null, cuisine: null, source: 'openstreetmap',
    offRouteKm: 0.4, alongKm: 70, spareKm: 22, ...over,
  }) as unknown as RefuelCandidate

  const answering = (over: Partial<RefuelSearch> = {}) => ({
    ...idle, openFor: '7:1', ...over,
  } as unknown as RefuelSearch)

  it('FE-MOB-RTROW-027: says it is looking while the search runs', () => {
    render(<RtDryRow {...props} refuel={answering({ loading: true })} onSearch={vi.fn()} />)

    expect(screen.getByText('roadtrip.refuel.looking')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-028: offers what it found, with the detour and what is left in the tank', () => {
    render(
      <RtDryRow
        {...props}
        refuel={answering({ outcome: 'found', results: [offer()] })}
        onSearch={vi.fn()}
        onAccept={vi.fn()}
      />,
    )

    expect(screen.getByText('Shell Ebina')).toBeInTheDocument()
    expect(screen.getByText('roadtrip.poi.offRoute:400 m · roadtrip.refuel.spare:22 km')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-029: an offer three legs away does not light up this band', () => {
    // One search is open at a time and it names the dry point it belongs to.
    render(
      <RtDryRow
        {...props}
        refuel={answering({ openFor: '7:4', outcome: 'found', results: [offer()] })}
        onSearch={vi.fn()}
      />,
    )

    expect(screen.queryByText('Shell Ebina')).toBeNull()
  })

  it('FE-MOB-RTROW-030: taking an offer goes through the planner, and never without permission', () => {
    const onAccept = vi.fn()
    const refuel = answering({ outcome: 'found', results: [offer()] })
    const view = render(<RtDryRow {...props} refuel={refuel} onSearch={vi.fn()} onAccept={onAccept} />)

    fireEvent.click(screen.getByRole('button', { name: 'roadtrip.refuel.add:Shell Ebina' }))
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ osm_id: 'n1' }))
    view.unmount()

    render(<RtDryRow {...props} refuel={refuel} />)
    expect(screen.queryByRole('button', { name: 'roadtrip.refuel.add:Shell Ebina' })).toBeNull()
    // The offer is still worth seeing: a reader can look up a station even if they
    // cannot put it on the trip.
    expect(screen.getByText('Shell Ebina')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-031: three sentences for three different facts, and none of them "nothing here"', () => {
    const none = render(<RtDryRow {...props} refuel={answering({ outcome: 'none' })} onSearch={vi.fn()} />)
    expect(screen.getByText('roadtrip.refuel.none')).toBeInTheDocument()
    none.unmount()

    const cut = render(<RtDryRow {...props} refuel={answering({ outcome: 'incomplete' })} onSearch={vi.fn()} />)
    expect(screen.getByText('roadtrip.refuel.incomplete')).toBeInTheDocument()
    cut.unmount()

    render(<RtDryRow {...props} refuel={answering({ outcome: 'failed' })} onSearch={vi.fn()} />)
    // A request that failed never checked the stretch, so it must not read as empty.
    expect(screen.getByText('roadtrip.refuel.failed')).toBeInTheDocument()
    expect(screen.queryByText('roadtrip.refuel.none')).toBeNull()
  })
})

describe('RtAutoRow', () => {
  it('FE-MOB-RTROW-023: marks the end of a day with the moon and the time it stopped', () => {
    const { container } = render(<RtAutoRow phase="end" time="22:00" chrome={chrome} />)

    expect(screen.getByText('roadtrip.window.stop')).toBeInTheDocument()
    expect(screen.getByText('22:00')).toBeInTheDocument()
    expect(container.querySelector('.lucide-moon')).not.toBeNull()
  })

  it('FE-MOB-RTROW-024: marks the morning with the sunrise and no clock when there is none', () => {
    const { container } = render(<RtAutoRow phase="resume" time={null} chrome={chrome} />)

    expect(screen.getByText('roadtrip.window.resume')).toBeInTheDocument()
    expect(container.querySelector('.lucide-sunrise')).not.toBeNull()
    expect(screen.queryByText('22:00')).toBeNull()
  })
})

describe('RtSpillRow', () => {
  it('FE-MOB-RTROW-025: names the day the night drive came from and when it set off', () => {
    render(
      <RtSpillRow fromDayNumber={1} departs="23:10" chrome={chrome}>
        <span>Fuji Viewpoint</span>
      </RtSpillRow>,
    )

    expect(screen.getByText('roadtrip.spill.title:1')).toBeInTheDocument()
    expect(screen.getByText('roadtrip.spill.departs:23:10')).toBeInTheDocument()
    expect(screen.getByText('Fuji Viewpoint')).toBeInTheDocument()
  })

  it('FE-MOB-RTROW-026: leaves the departure off when the night drive has no time', () => {
    render(<RtSpillRow fromDayNumber={1} departs={null} chrome={chrome} />)

    expect(screen.getByText('roadtrip.spill.title:1')).toBeInTheDocument()
    expect(screen.queryByText(/roadtrip\.spill\.departs/)).toBeNull()
  })
})
