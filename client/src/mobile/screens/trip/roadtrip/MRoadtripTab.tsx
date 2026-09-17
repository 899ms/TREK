import { useRef } from 'react'
import { AlertTriangle, MapPin, Navigation } from 'lucide-react'
import { useMPlanDaySwipe } from '../plan/useMPlanDaySwipe'
import { showStopOnMap, useMRoadtrip } from './useMRoadtrip'
import { useMRtCorridor } from './useMRtCorridor'
import { useMRtAlternatives } from './useMRtAlternatives'
import MRtCorridorBar from './MRtCorridorBar'
import MRtAlternativesBar from './MRtAlternativesBar'
import { RtAutoRow, RtDryRow, RtLegRow, RtSpillRow, RtStopRow, type RowChrome } from './MRoadtripRows'
import { badgeLabel, distanceBadge } from './stageBadges'
import MBadge from '../../../components/MBadge'
import MDancingTrek from '../../../components/MDancingTrek'
import PlaceAvatar from '../../../../components/shared/PlaceAvatar'
import { dayColor } from '../../../../components/Roadtrip/dayColors'
import { formatDurationShort } from '../../../../components/Roadtrip/roadtripModel'
import { getNavigationTargets } from '../../../../components/Planner/placeNavigation'
import { useRoadtripSettings } from '../../../../hooks/useRoadtripSettings'
import { useSettingsStore } from '../../../../store/settingsStore'
import { formatDistance } from '../../../../utils/units'
import { isRtlLanguage } from '../../../../i18n'
import type { MTripTabPanelProps } from '../MTripShell'
import { legReroutable, type StopRow } from '../../../../components/Roadtrip/roadtripRowModel'

/**
 * The road trip tab: one day of the drive, as a chain or on the map.
 *
 * Both halves are this one component because they share a stage, and the switch
 * between them must not lose it. The map itself is not here: it is the shell's single
 * instance, shared with the plan tab and lying underneath, so the map half of this
 * screen is nothing but the stage bar floating over it.
 *
 * The stage picker is the shell's day-chip rail. This panel renders at z-20, below the
 * chips at z-25, which is the whole of that: the chips were always mounted and only
 * ever hidden because the other tabs cover them at z-30. With them come the auto
 * scroll, the day tints, the label format and the second tap that opens the day sheet.
 */
export default function MRoadtripTab({ planner, shell }: MTripTabPanelProps) {
  const { t, days } = planner
  const panelRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const rt = useMRoadtrip(planner)
  const corridor = useMRtCorridor(planner, shell)
  // Called once here and handed down, like `rt`: the chain's leg buttons and the bar over
  // the map read one controller, so a leg shows pressed for exactly the picker on the map.
  const alts = useMRtAlternatives(planner, shell)
  const unit = useSettingsStore(s => s.settings.distance_unit)
  const chrome: RowChrome = { t, unit }

  // The same gesture the day timeline uses, called rather than rebuilt: 370 lines of
  // worked-out conflict avoidance, down to the dead 24px gutter that stops iOS from
  // reading a swipe as its own back gesture.
  const daySwipe = useMPlanDaySwipe({
    days,
    selectedDayId: planner.selectedDayId,
    // skipFit: the map underneath stays mounted, and the stage's own focus points
    // frame it as soon as the selection moves.
    onSelectDay: dayId => planner.handleSelectDay(dayId, true),
    panelRef,
    cardRef,
    editing: false,
    dragging: false,
    menuOpen: !!shell.sheet,
    rtl: isRtlLanguage(planner.language),
    describeDay: (i, n) => t('mobileTrip.dayAnnounce', { current: i + 1, total: n }),
  })

  const stage = rt.stage

  const openStop = (row: StopRow) => {
    shell.openSheet('rtstop', { dayId: row.stop.ownerDayId, assignmentId: row.stop.assignmentId })
  }

  // The search bar sits in the same band on both halves, at the same offset, so the
  // list/map switch never moves it: it is one stage seen two ways, and a control that
  // jumps between them is a control you have to find twice. The band and the margins
  // are the plan tab's POI bar, for the same reason.
  //
  // Only over a stage. Without one there is no drive to search along: the corridor would
  // fall back to the trip's first routed day, which is not the one on screen, and every
  // distance it answered with would be measured against a road nobody is looking at.
  const searchBar = stage && (
    <div className="pointer-events-auto absolute left-4 right-4 top-[calc(var(--m-safe-top,12px)+96px)] z-[26]">
      <MRtCorridorBar planner={planner} corridor={corridor} onOpen={() => shell.openSheet('rtsearch')} />
    </div>
  )

  // ── Map half: the two bars, and nothing else. Everything between them belongs to the
  // map instance the shell keeps mounted, so this layer must not swallow taps.
  //
  // While other ways of driving a leg are on offer, their bar takes the stage bar's slot
  // and the search bar steps away. The picker is modal on the map: its lines are the
  // question on screen, a corridor search started under it would draw its pins over
  // them, and the band it frees at the top is room the leg is framed into.
  if (shell.rtView === 'map') {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        {!alts.open && searchBar}
        {/* Just above the dock, the same gap everything else on this shell keeps from
            it. Twenty pixels higher left a band of map between the two that read as a
            gap rather than as breathing room, and pushed the map's own buttons into
            the bar's top edge. */}
        <div className="pointer-events-auto absolute left-4 right-4 bottom-[calc(var(--bottom-nav-h,84px)+4px)]">
          {/* `rt` is handed down rather than looked up again: useMRoadtrip owns a
              30s interval and a network subscription, and a second call would run a
              second pair of them for the same screen. */}
          {alts.open
            ? <MRtAlternativesBar planner={planner} alts={alts} />
            : <StageBar planner={planner} rt={rt} onOpen={openStop} />}
        </div>
      </div>
    )
  }

  // ── List half ────────────────────────────────────────────────────────────────
  return (
    <div ref={panelRef} className="absolute inset-0" {...daySwipe.handlers}>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{daySwipe.announcement}</span>
      {searchBar}
      <div
        ref={cardRef}
        className={`absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--bottom-nav-h,84px)+22px)] ${
          searchBar ? 'pt-[calc(var(--m-safe-top,12px)+150px)]' : 'pt-[calc(var(--m-safe-top,12px)+102px)]'
        }`}
      >
        {rt.empty || !stage ? (
          <EmptyStage planner={planner} loading={rt.loading} />
        ) : (
          <>
            {/* Head card: a header over the chain rather than a third of it. The day's
                facts ride on the date line as badges instead of in a band of their own
                under the clocks, and they move under the date together when a long
                locale or the sentence for a partial total does not fit beside it.

                The two clocks stay the largest figures on the screen: when the stage
                starts and when it reaches its last place. Both are ones the chain below
                repeats, read off the same arrival column (see stageClocks), so a first
                stop pinned at 10:00 heads the card at 10:00 and not at the end of its
                stay. They carry dir=ltr for the same reason the rows do: a clock reads
                the same way round in an RTL locale.

                No day colour here. It keys the day's line on the map, and on this half
                the map lies under the list, so a dot in the card had nothing on screen
                to explain it and read as a status light. The stage bar's picture ring
                carries the colour on the half where the line is visible. */}
            <section className="rounded-[22px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="me-auto whitespace-nowrap font-geist text-[0.625rem] font-bold uppercase tracking-[.09em] text-m-muted">
                  {stageDateLabel(planner, stage.dayId) ?? t('roadtrip.day', { number: stage.dayNumber })}
                </span>
                {/* The two badges wrap as a pair. Loose in the line, a long drive would keep
                    the date and the drive on one line and drop the count alone onto the next,
                    at the opposite edge from the badge it belongs with. */}
                <span className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1">
                  {/* The drive badge alone may break inside itself. A badge keeps its text on
                      one line, which is right for a figure, but the partial sentence runs to
                      nearly fifty characters in some locales and would push past the card on
                      a narrow phone, so this one stops at the row's width and lets its height
                      follow the text. The stop count is a figure and keeps to one line. */}
                  <MBadge caps={false} wrap>
                    {stage.distance > 0
                      ? t('roadtrip.leg.driveText', {
                        distance: formatDistance(stage.distance / 1000, unit),
                        time: formatDurationShort(stage.duration),
                      })
                      : t('roadtrip.summary.partial')}
                  </MBadge>
                  <MBadge>{t('roadtrip.day.stopCount', { count: rt.stops })}</MBadge>
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-geist text-[0.5625rem] font-bold uppercase tracking-[.08em] text-m-faint">
                    {t('mobileTrip.rtStart')}
                  </span>
                  <span dir="ltr" className="mt-0.5 block text-[1.5rem] font-extrabold leading-none tabular-nums text-m-ink">
                    {rt.clocks.start ?? '-'}
                  </span>
                </span>
                <span className="min-w-0 text-right">
                  <span className="block font-geist text-[0.5625rem] font-bold uppercase tracking-[.08em] text-m-faint">
                    {t('roadtrip.stay.arrive')}
                  </span>
                  <span dir="ltr" className="mt-0.5 block text-[1.5rem] font-extrabold leading-none tabular-nums text-m-ink">
                    {rt.clocks.arrive ?? '-'}
                  </span>
                </span>
              </div>
              {stage.dayWarning && (
                <div
                  className="mt-2 rounded-[13px] px-[11px] py-[7px]"
                  style={{ background: 'color-mix(in srgb, var(--m-st-pending) 12%, transparent)', color: 'var(--m-st-pending)' }}
                >
                  <span className="flex items-center gap-[6px] text-[0.71875rem] font-semibold">
                    <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
                    {t('roadtrip.limit.dayOver', {
                      time: formatDurationShort((stage.dayWarning.minutes - stage.dayWarning.limitMinutes) * 60),
                    })}
                  </span>
                  {/* The sentence the desktop hides in a title attribute. */}
                  <span className="mt-[3px] block font-geist text-[0.65625rem] text-m-muted">
                    {t('roadtrip.limit.hint')}
                  </span>
                </div>
              )}
            </section>

            {rt.upNext && <UpNext planner={planner} shell={shell} rt={rt} stageDayId={stage.dayId} onOpen={openStop} />}

            <section className="mt-2.5 overflow-hidden rounded-[22px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)] px-3.5 pb-3 pt-1">
              {rt.rows.map((row, i) => {
                if (row.kind === 'stop') return <RtStopRow key={`s${i}`} row={row} chrome={chrome} onOpen={() => openStop(row)} />
                if (row.kind === 'leg') {
                  // Only where the desk rail offers it too (legReroutable), and with the
                  // card's day id, the one the desk passes: the planner finds the day each
                  // stop is stored on by itself.
                  return (
                    <RtLegRow
                      key={`l${i}`}
                      seg={row.seg}
                      mode={row.mode}
                      chrome={chrome}
                      onAlternatives={alts.canAsk && legReroutable(stage, row.index) ? () => alts.ask(stage.dayId, row.index) : undefined}
                      alternativesOpen={alts.isOpenFor(stage.dayId, row.index)}
                      alternativesDisabled={!alts.editable}
                    />
                  )
                }
                if (row.kind === 'auto') return <RtAutoRow key={`a${i}`} phase={row.phase} time={row.time} chrome={chrome} />
                if (row.kind === 'spill') {
                  return <RtSpillRow key={`p${i}`} fromDayNumber={row.fromDayNumber} departs={row.departs} chrome={chrome} />
                }
                return (
                  <RtDryRow
                    key={`d${i}`}
                    intoLegKm={row.intoLegKm}
                    chrome={chrome}
                    electric={rt.electric}
                    offline={rt.offline}
                    refuel={planner.refuel}
                    dayId={stage.dayId}
                    legIndex={row.legIndex}
                    onSearch={planner.can('day_edit', planner.trip)
                      ? () => planner.askRefuel(stage.dayId, dryPointFor(planner, stage.dayId, row.legIndex))
                      : undefined}
                    onAccept={planner.can('day_edit', planner.trip)
                      ? poi => planner.acceptRefuel(stage.dayId, poi, dryPointFor(planner, stage.dayId, row.legIndex))
                      : undefined}
                  />
                )
              })}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The stage bar over the map: which day, where to, what it costs.
 *
 * One line rather than a sheet that can be dragged open. A drag sheet brings a panel
 * height the map fit has to account for and lifts the locate and style buttons with
 * it, which is a bigger change than this half of the screen needs to be useful.
 *
 * It reads as a place, so a tap opens that place's stop, the same sheet its row in the
 * chain opens. It used to switch to the chain instead, which broke the promise its name
 * makes; the header's list switch is the way back to the chain. Name, picture, clock and
 * tap all come off one row (see stageEnd), so the bar can never name one stop and open
 * another.
 *
 * It leads with a picture of that place rather than a coloured dot, because a place is
 * recognised by how it looks long before its name is read. The facts beside it are badges
 * rather than one line joined with dots: each one is a figure on its own, and a pill edge
 * separates them at a glance where a middle dot has to be found first. Every badge is
 * neutral. The whole bar is one button, and a filled pill inside it would read as a
 * second control that does something else.
 *
 * Its height is a contract: 38px picture, a 39px text column, 10px padding and the border
 * make the 61px the map area lifts its round buttons over (--m-stage-lift in MMapArea).
 * Growing the picture or a badge moves those buttons into the bar's top edge.
 */
function StageBar({ planner, rt, onOpen }: {
  planner: MTripTabPanelProps['planner']
  rt: ReturnType<typeof useMRoadtrip>
  onOpen: (row: StopRow) => void
}) {
  const { t } = planner
  const unit = useSettingsStore(s => s.settings.distance_unit)
  const dayColorsOn = useRoadtripSettings(s => s.roadtrip_day_colors, planner.tripId)
  const stage = rt.stage

  if (!stage) {
    // No stage means the day filter is off, which on the map is the whole drive. Its total
    // is left out while nothing is measured, rather than printed as a drive of 0 m.
    const total = distanceBadge(planner.roadtripRoutes.totalDistance, unit)
    return (
      <div className="flex items-center gap-2.5 rounded-[22px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)] px-[14px] py-[11px] shadow-[0_16px_44px_-14px_rgba(0,0,0,.35)] backdrop-blur-[24px] backdrop-saturate-[1.6]">
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-m-ink">{t('roadtrip.title')}</span>
        {total && <MBadge size="sm" caps={false}>{total}</MBadge>}
      </div>
    )
  }

  const tint = dayColorsOn ? dayColor(stage.dayNumber) : null
  const end = rt.end
  const name = end?.stop.name ?? t('roadtrip.stop.none')
  const stopCount = t('roadtrip.day.stopCount', { count: rt.stops })
  const distance = distanceBadge(stage.distance, unit)
  const pending = t('roadtrip.leg.pending')

  const inner = (
    <>
      {/* Hidden from the name, which the title already carries: the photo's alt text is the
          place name a second time. The day colour rings the picture when the day colours
          are on, because the ring is what ties this bar to its own line on the map. */}
      <span
        aria-hidden="true"
        className="flex h-[38px] w-[38px] flex-none items-center justify-center overflow-hidden rounded-full border-2 border-[color:var(--m-avbr)] bg-[color:var(--m-ic)] text-m-muted"
        // theme-lint-disable: map paint, see dayColors.ts.
        style={tint ? { borderColor: tint.line } : undefined}
      >
        {/* Keyed by place: the avatar takes its photo from the first place it is handed and
            keeps it while a new one is still loading or has none, so without a remount a
            swipe to the next day would still picture the previous day's destination. */}
        {rt.endPlace ? (
          <PlaceAvatar key={rt.endPlace.id} place={rt.endPlace} category={rt.endCategory} size={34} />
        ) : (
          <MapPin size={16} strokeWidth={2} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold leading-[18px] text-m-ink">{name}</span>
        <span className="mt-[3px] flex min-w-0 items-center gap-[5px] overflow-hidden">
          <MBadge>{stopCount}</MBadge>
          {/* dir=ltr for the reason the rows carry it: a clock reads the same way round in an RTL locale. */}
          {end?.time && <MBadge caps={false}><span dir="ltr">{end.time}</span></MBadge>}
        </span>
      </span>
      {distance ? <MBadge size="sm" caps={false}>{distance}</MBadge> : <MBadge size="sm">{pending}</MBadge>}
    </>
  )
  const box = 'flex w-full items-center gap-2.5 rounded-[22px] border border-[color:var(--m-cbr)] bg-[color:var(--m-card)] px-[11px] py-[10px] text-left shadow-[0_16px_44px_-14px_rgba(0,0,0,.35)] backdrop-blur-[24px] backdrop-saturate-[1.6]'

  // A stage without a single stop has nothing for a tap to open, so a plain block rather
  // than a dead button, the rule the whole-drive line above follows too.
  if (!end) return <div className={box}>{inner}</div>
  return (
    <button
      type="button"
      onClick={() => onOpen(end)}
      aria-label={badgeLabel([name, stopCount, end.time, distance ?? pending])}
      className={box}
    >
      {inner}
    </button>
  )
}

/**
 * What is coming up, measured against the clock rather than the plan.
 *
 * Without it the stage is a morning plan in a narrow column: leave at 09:15 instead of
 * 08:30 and every figure on the screen is quietly wrong for the rest of the day. The
 * planned time stays put and the delta sits beside it, because the planned time is the
 * number you want to compare against.
 */
function UpNext({ planner, shell, rt, stageDayId, onOpen }: {
  planner: MTripTabPanelProps['planner']
  shell: MTripTabPanelProps['shell']
  rt: ReturnType<typeof useMRoadtrip>
  stageDayId: number
  onOpen: (row: StopRow) => void
}) {
  const { t } = planner
  const next = rt.upNext
  if (!next) return null
  const late = next.minutesUntil < 0
  const place = planner.places.find(p => p.id === next.row.stop.placeId)
  const targets = place ? getNavigationTargets(place) : []

  return (
    <section className="mt-2.5 rounded-[22px] border border-[color:var(--m-inbr)] bg-[color:var(--m-inner)] px-4 py-3.5 shadow-[0_18px_44px_-18px_rgba(0,0,0,.3)]">
      <button type="button" onClick={() => onOpen(next.row)} className="w-full text-left">
        <span className="flex items-center justify-between gap-2">
          <span className="font-geist text-[0.65625rem] font-bold uppercase tracking-[.08em] text-m-muted">
            {t('mobileTrip.upNext')}
          </span>
          {/* One pill, two readings: a countdown while the stop is still ahead, the
              delay once its planned time has passed. There is no position source, so
              "behind plan" is the strongest honest claim available. */}
          <span
            className="whitespace-nowrap rounded-full px-2 py-[2px] text-[0.6875rem] font-semibold"
            style={late
              ? { background: 'color-mix(in srgb, var(--m-st-pending) 16%, transparent)', color: 'var(--m-st-pending)' }
              : { background: 'var(--m-ic)', color: 'var(--m-ink)' }}
          >
            {late
              ? t('mobileTrip.rtBehind', { time: formatDurationShort(-next.minutesUntil * 60) })
              : t('mobileTrip.inCountdown', { time: formatDurationShort(next.minutesUntil * 60) })}
          </span>
        </span>
        <span className="mt-1.5 block truncate text-[1.125rem] font-bold text-m-ink">{next.row.stop.name}</span>
        {next.row.time && (
          <span className="mt-[2px] block font-geist text-[0.75rem] tabular-nums text-m-muted">{next.row.time}</span>
        )}
      </button>
      <div className="mt-3 flex gap-2">
        <a
          href={targets[0]?.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!targets.length}
          className={`flex h-11 flex-1 items-center justify-center gap-[7px] rounded-full bg-m-act text-[0.8125rem] font-semibold text-m-actfg shadow-[0_10px_24px_-10px_rgba(0,0,0,.45)] ${targets.length ? '' : 'pointer-events-none opacity-40'}`}
        >
          <Navigation size={15} strokeWidth={2.2} aria-hidden="true" />
          {t('places.navigate')}
        </a>
        <button
          type="button"
          // Up next is a stop of the stage on screen, so the day stays put and only the camera moves.
          onClick={() => showStopOnMap(planner, shell, next.row.stop, stageDayId)}
          aria-label={t('mobileTrip.showOnMap')}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[color:var(--m-gbr)] bg-[color:var(--m-glass)] text-m-ink backdrop-blur-[24px] backdrop-saturate-[1.7]"
        >
          <MapPin size={17} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

/**
 * An empty stage is not a failure.
 *
 * A day with one place has no drive, because a route needs two. So no summary card
 * full of zeroes, no skeleton and no button, just the line and the one sentence that
 * says out loud where the planning happens.
 */
function EmptyStage({ planner, loading }: { planner: MTripTabPanelProps['planner']; loading: boolean }) {
  const { t } = planner
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <MDancingTrek scene="guide" className="mb-2" />
      <p className="text-[0.9375rem] font-semibold text-m-ink">
        {loading ? t('roadtrip.summary.partial') : t('roadtrip.empty.title')}
      </p>
      {!loading && (
        <p className="mt-1.5 max-w-[27ch] font-geist text-[0.78125rem] leading-[1.5] text-m-muted">
          {t('mobileTrip.rtPlanOnDesktop')}
        </p>
      )}
    </div>
  )
}

/* ── small helpers ────────────────────────────────────────────────────────── */

function stageDateLabel(planner: MTripTabPanelProps['planner'], dayId: number): string | null {
  const day = planner.days.find(d => d.id === dayId)
  if (!day?.date) return null
  const date = new Date(`${day.date.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(planner.language, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

/** The dry point the refuel search measures from, looked up by its leg. */
function dryPointFor(planner: MTripTabPanelProps['planner'], dayId: number, legIndex: number) {
  const day = planner.roadtripRoutes.days.find(d => d.dayId === dayId)
  const point = day?.dryPoints?.find(p => p.legIndex === legIndex)
  return point!
}
