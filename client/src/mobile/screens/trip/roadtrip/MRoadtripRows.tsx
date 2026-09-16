import { AlertTriangle, Bike, CarFront, Footprints, Fuel, Hourglass, Moon, Pin, Plus, RotateCcw, Sunrise, X, Zap } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import MDancingTrek from '../../../components/MDancingTrek'
import MIconBtn from '../../../components/MIconBtn'
import { formatDurationShort, serviceColor } from '../../../../components/Roadtrip/roadtripModel'
import { STOP_KIND_BY_KEY } from '../../../../components/Roadtrip/stopKinds'
import { formatDistance } from '../../../../utils/units'
import type { StopRow } from '../../../../components/Roadtrip/roadtripRowModel'
import type { RefuelSearch } from '../../../../components/Roadtrip/useRefuelSearch'
import { REFUEL_EMPTY_KEY, REFUEL_WORDS, refuelBandState, type RefuelCandidate } from '../../../../components/Roadtrip/refuelSuggestion'
import type { DistanceUnit, RouteSegment, ScheduleWarning } from '@trek/shared/roadtrip'
import type { TranslationFn } from '../../../../types'

/**
 * The four row types of the mobile drive chain, plus the two bands that interrupt it.
 *
 * What the desktop rail does in five stacked 8px badges per stop, this does in at most
 * two 10.5px marks: on touch there is no hover, so a badge nobody can explain is worse
 * than no badge. The rest of a stop's findings live in its sheet, written out as full
 * sentences. Which mark survives is decided in `roadtripRowModel.pickWarning`, not here.
 *
 * Nothing in this file except a destination row reacts to a tap. Drive bands, discs,
 * marks, the night block and the day-end point carry no role and no chevron, so
 * nothing looks like a button that isn't one.
 */

export interface RowChrome {
  t: TranslationFn
  unit: DistanceUnit
}

/** 30px disc: a number for a destination, the kind's colour for a service stop. */
function Disc({ row }: { row: StopRow }) {
  const kind = row.stop.stopType ? STOP_KIND_BY_KEY[row.stop.stopType] : undefined
  if (row.service && kind) {
    const Icon = kind.Icon
    return (
      <span
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-white"
        // theme-lint-disable: the stop kinds share their colour with the map markers,
        // which sit on tiles rather than on one of the app's own surfaces.
        style={{ background: serviceColor(row.stop.stopType) }}
      >
        <Icon size={15} strokeWidth={2.1} aria-hidden="true" />
      </span>
    )
  }
  return (
    // Deliberately not font-geist: `.m-root .font-geist` caps the tier at Medium,
    // which would quietly undo the bold on a number that has to read at 12px.
    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--m-ic)] text-[0.75rem] font-bold tabular-nums text-m-ink">
      {row.number}
    </span>
  )
}

function Mark({ icon, children, tone }: { icon: ReactNode; children: ReactNode; tone?: 'warn' }) {
  return (
    <span
      className="inline-flex h-[22px] items-center gap-[4px] rounded-full px-[8px] font-geist text-[0.65625rem] font-semibold"
      style={tone === 'warn'
        ? { background: 'color-mix(in srgb, var(--m-st-pending) 14%, transparent)', color: 'var(--m-st-pending)' }
        : { background: 'var(--m-ic)', color: 'var(--m-muted)' }}
    >
      {icon}
      {children}
    </span>
  )
}

/** The short form of a finding: the number only, the sentence waits in the sheet. */
function warningMark(warning: ScheduleWarning, chrome: RowChrome): ReactNode {
  const { t, unit } = chrome
  if (warning.code === 'late') {
    return <Mark tone="warn" icon={<AlertTriangle size={10} strokeWidth={2} />}>{`+${warning.minutes ?? 0} min`}</Mark>
  }
  if (warning.code === 'range') {
    return <Mark tone="warn" icon={<Fuel size={10} strokeWidth={2} />}>{formatDistance(warning.sinceKm ?? 0, unit)}</Mark>
  }
  if (warning.code === 'leg') {
    return <Mark tone="warn" icon={<Hourglass size={10} strokeWidth={2} />}>{formatDurationShort((warning.overMinutes ?? 0) * 60)}</Mark>
  }
  return <Mark tone="warn" icon={<Moon size={10} strokeWidth={2} />}>{t('roadtrip.warn.overnight')}</Mark>
}

/**
 * A stop of the stage. The whole row is the tap target, at least 46px tall, which is
 * why it is a div with role rather than a button: the desktop needs controls nested
 * inside its row, and a button inside a button is not markup.
 */
export function RtStopRow({ row, chrome, onOpen }: {
  row: StopRow
  chrome: RowChrome
  onOpen: () => void
}) {
  const { t, unit } = chrome
  const marks: ReactNode[] = []
  if (row.dwellMinutes) {
    marks.push(
      <Mark key="dwell" icon={<Hourglass size={10} strokeWidth={2} />}>{formatDurationShort(row.dwellMinutes * 60)}</Mark>,
    )
  }
  if (row.warning) marks.push(<span key="warn">{warningMark(row.warning, chrome)}</span>)
  if (!marks.length && row.offRoadMeters) {
    marks.push(
      <Mark key="off" icon={<Footprints size={10} strokeWidth={2} />}>
        {formatDistance(row.offRoadMeters / 1000, unit)}
      </Mark>,
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }}
      className="grid cursor-pointer items-center gap-x-[10px] py-1" style={{ gridTemplateColumns: '34px 1fr auto' }}
    >
      <span className="flex justify-center"><Disc row={row} /></span>
      <span className="min-w-0 py-2">
        <span className={`block text-[0.875rem] leading-[1.25] ${row.service ? 'truncate font-medium text-m-muted' : 'line-clamp-2 font-semibold text-m-ink'}`}>
          {row.stop.name}
        </span>
        {marks.length > 0 && <span className="mt-[4px] flex flex-wrap items-center gap-[5px]">{marks}</span>}
      </span>
      {row.time && (
        // dir=ltr so a clock reads the same way round in an RTL locale.
        <span dir="ltr" className={`flex items-center gap-[3px] whitespace-nowrap text-[0.8125rem] tabular-nums ${row.pinned ? 'font-semibold text-m-ink' : 'font-medium text-m-faint'}`}>
          {row.pinned && <Pin size={9} strokeWidth={2.4} className="flex-none text-m-faint" aria-label={t('roadtrip.stop.pinned')} />}
          {row.time}
        </span>
      )}
    </div>
  )
}

const LEG_ICONS: Record<string, typeof CarFront> = {
  walking: Footprints,
  cycling: Bike,
}

/** The drive between two stops. 12px rather than the desktop's 10: a four-hour leg
 *  deserves the space it takes. A div, never a button: tapping a leg to pick another
 *  route is a desktop affordance and costs up to five routing requests. */
export function RtLegRow({ seg, mode, chrome }: {
  seg: RouteSegment | undefined
  mode: string | null
  chrome: RowChrome
}) {
  const { t } = chrome
  const Icon = mode && LEG_ICONS[mode] ? LEG_ICONS[mode] : mode?.startsWith('plugin:') ? Zap : CarFront
  const text = seg
    ? t('roadtrip.leg.driveText', { distance: seg.distanceText, time: seg.durationText ?? seg.drivingText })
    : t('roadtrip.leg.pending')
  return (
    <div className="grid items-center gap-x-[10px]" style={{ gridTemplateColumns: '34px 1fr auto' }}>
      {/* flex-col, not flex: in a row the dashes would stretch sideways and read as
          a barcode. --m-conn rather than --m-rowbr, because the row hairline is 4.5%
          alpha and disappears in sunlight, and this line is what says "you drive here". */}
      <span className="flex min-h-[40px] flex-col items-center" aria-hidden="true">
        <span className="w-[2px] flex-1" style={{ backgroundImage: 'repeating-linear-gradient(var(--m-conn) 0 4px, transparent 4px 8px)' }} />
      </span>
      <span className="my-1.5 flex items-center gap-[7px] rounded-[13px] bg-[color:var(--m-ic)] px-[11px] py-[7px]">
        <Icon size={14} strokeWidth={2} className="flex-none text-m-muted" aria-hidden="true" />
        <span className="truncate text-[0.75rem] font-semibold tabular-nums text-m-ink">{text}</span>
      </span>
      <span />
    </div>
  )
}

/**
 * The ground the dry band stands on, where the mascot is.
 *
 * Opaque on purpose: the mascot cuts its eyes and wheel hubs out in `--m-bg`, and
 * `--m-card` is 55% alpha in both themes, so on the card's own ground the red body would
 * show through the eyes. `--m-sheetop` is the phone's opaque surface. Mixed against that
 * rather than against `--m-bg`, because the mascot's span renames `--m-bg` to this value
 * and a variable defined in terms of itself is invalid, which would drop the cutouts.
 */
const DRY_GROUND = 'color-mix(in srgb, var(--m-st-danger) 11%, var(--m-sheetop))'

/**
 * The lamp's circle: a soft wash of the band's own colour rather than the black action
 * fill. The lamp is a warning light that happens to be pressable, and the 44px circle is
 * what tells a thumb so without turning it into the loudest thing on the screen.
 */
const DANGER_SOFT: CSSProperties = {
  background: 'color-mix(in srgb, var(--m-st-danger) 14%, transparent)',
  color: 'var(--m-st-danger)',
}

/**
 * Where the tank runs out on this leg, and the reserve lamp that goes looking.
 *
 * The desktop band's design, sized for a thumb: the mascot on its skateboard and not
 * enjoying it, a small uppercase warning, and the lamp itself as the button. Not a pill
 * with the words on it, because a labelled pill beside a mascot and a title leaves the
 * title almost no room: the band's content box is only about
 * 299px wide at 375px and 284px at 360px, and a label like "Cerca un punt de recàrrega"
 * is a long way into that. So the lamp is the button, as on the desktop, and its words
 * live in the label a screen reader announces.
 *
 * 44px where the desktop lamp is 22px, because it is aimed with a thumb. The title clamps
 * to two lines instead of truncating, because a warning that loses its end says nothing
 * ("Qui il serbatoio si esaurisce" does not fit on one). Offline the lamp stops glowing,
 * because a lamp that glows invites a press that cannot work. Somebody who may not edit
 * the day still sees the lamp, as a plain mark: the empty tank is information, not an
 * action.
 *
 * While a search runs or its offers show, the lamp steps aside for a close, and an empty
 * answer leaves a retry in its place. The close matters because the map draws the offers,
 * and without it nothing in the band could clear those pins short of accepting one. It
 * stays while offline too, and the offline sentence stands down with it: closing is local,
 * so there is no dead control left to explain. Which control shows, which offers and which
 * empty sentence is decided in `refuelBandState`, the same place the desktop band reads
 * it from.
 */
export function RtDryRow({ intoLegKm, chrome, electric, onSearch, offline, refuel, dayId, legIndex, onAccept }: {
  intoLegKm: number
  chrome: RowChrome
  electric: boolean
  onSearch?: () => void
  offline: boolean
  refuel: RefuelSearch
  dayId: number
  legIndex: number
  /** Takes one of the offers onto the trip. Absent for somebody who may not edit days. */
  onAccept?: (poi: RefuelCandidate) => void
}) {
  const { t, unit } = chrome
  const band = refuelBandState(refuel, dayId, legIndex)
  const words = REFUEL_WORDS[electric ? 'electric' : 'fuel']
  const Lamp = electric ? Zap : Fuel
  return (
    <div
      className="-mx-1 my-2 flex flex-col gap-2 rounded-[16px] border px-3 py-2.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--m-st-danger) 22%, transparent)',
        // Flat through the padding and the 44px header row, so the ground behind the
        // mascot's eyes is the one they are cut in, and only the answers below fade out.
        backgroundImage: `linear-gradient(180deg, ${DRY_GROUND} 0px, ${DRY_GROUND} 54px, var(--m-card) 100%)`,
        boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--m-st-danger) 20%, transparent)',
      }}
    >
      <div className="flex min-h-[44px] items-center gap-2.5">
        {/* Renamed on this span only, never on the band: the offers below are drawn in
            --m-ink too, and they have to stay ink. Not a tap target either, because
            nothing in the chain but a destination row reacts to a tap. */}
        <span
          className="pointer-events-none flex flex-none"
          style={{ '--m-ink': 'var(--m-st-danger)', '--m-bg': DRY_GROUND } as CSSProperties}
        >
          {/* Out of fuel is a thing that happens to the drive, so it is the mascot with
              the vehicle, and it is not enjoying it. */}
          <MDancingTrek scene="transport" mood="sad" size={34} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-geist text-[0.625rem] font-bold uppercase leading-[1.35] tracking-[.09em] text-[color:var(--m-st-danger)]">
            {t(words.dry)}
          </span>
          <span className="mt-[2px] block font-geist text-[0.71875rem] tabular-nums text-m-muted">
            {t('roadtrip.refuel.after', { distance: formatDistance(Math.round(intoLegKm), unit) })}
          </span>
        </span>
        {band.control === 'close' ? (
          <MIconBtn variant="neutral" size={44} onClick={refuel.close} ariaLabel={t('common.close')}>
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </MIconBtn>
        ) : onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            disabled={offline}
            aria-label={t(band.control === 'again' ? 'roadtrip.refuel.again' : words.find)}
            style={offline ? undefined : DANGER_SOFT}
            className={`grid h-11 w-11 flex-none place-items-center rounded-full ${offline ? 'bg-[color:var(--m-ic)] text-m-faint' : ''}`}
          >
            {band.control === 'again'
              ? <RotateCcw size={17} strokeWidth={2.2} aria-hidden="true" />
              : <Lamp size={18} strokeWidth={2} className={offline ? undefined : 'trek-lowfuel'} aria-hidden="true" />}
          </button>
        ) : (
          <span className="grid h-11 w-11 flex-none place-items-center text-[color:var(--m-st-danger)]" aria-hidden="true">
            <Lamp size={18} strokeWidth={2} className="trek-lowfuel" />
          </span>
        )}
      </div>

      {/* Blunt rather than silent: the lamp keeps its place and this says why it is out. */}
      {onSearch && offline && band.control !== 'close' && (
        <span className="font-geist text-[0.6875rem] leading-[1.4] text-m-faint">{t('mobileTrip.rtSearchOffline')}</span>
      )}

      {band.loading && (
        <span className="font-geist text-[0.71875rem] text-m-muted">{t('roadtrip.refuel.looking')}</span>
      )}

      {/* The answer, in the band that asked. The desktop puts it in the rail row for the
          same reason: a station offered somewhere other than where the tank runs out is
          an offer somebody has to go and find. */}
      {band.offers.length > 0 && (
        <ul className="flex flex-col gap-[6px]">
          {band.offers.map(poi => (
            <RefuelOffer
              key={poi.osm_id}
              poi={poi}
              chrome={chrome}
              electric={electric}
              onAccept={onAccept ? () => onAccept(poi) : undefined}
            />
          ))}
        </ul>
      )}

      {/* Three sentences for three different facts. "Nothing on this stretch" after a
          request that failed states something that was never checked. */}
      {band.empty && (
        <span className="font-geist text-[0.71875rem] leading-[1.4] text-m-muted">{t(REFUEL_EMPTY_KEY[band.empty])}</span>
      )}
    </div>
  )
}

/**
 * One station on offer: what it is, the two figures that decide it, and a 38px plus.
 *
 * The detour is what the list is sorted by, because everything in it is reachable
 * already and what separates them is what the stop costs. What is left in the tank when
 * the car draws level comes second, with that detour counted in. Both as plain labelled
 * figures rather than the desktop's icon badges: a tooltip is the desktop's way of
 * saying which number is which, and there is no hover here to carry it.
 */
function RefuelOffer({ poi, chrome, electric, onAccept }: {
  poi: RefuelCandidate
  chrome: RowChrome
  electric: boolean
  onAccept?: () => void
}) {
  const { t, unit } = chrome
  const kind = STOP_KIND_BY_KEY[poi.category]
  const KindIcon = kind?.Icon ?? Fuel
  return (
    <li className="flex items-center gap-2.5 rounded-[14px] bg-[color:var(--m-card)] py-1.5 pe-1.5 ps-2.5">
      <span
        className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-white"
        // theme-lint-disable: the stop kinds share their colour with the map markers.
        style={{ background: serviceColor(poi.category) }}
        aria-hidden="true"
      >
        <KindIcon size={13} strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.78125rem] font-semibold text-m-ink">{poi.name}</span>
        <span className="mt-px block truncate font-geist text-[0.6875rem] tabular-nums text-m-muted">
          {[
            t('roadtrip.poi.offRoute', { distance: formatDistance(poi.offRouteKm, unit) }),
            t('roadtrip.refuel.spare', { distance: formatDistance(Math.round(poi.spareKm), unit) }),
          ].join(' · ')}
        </span>
      </span>
      {onAccept && (
        <button
          type="button"
          onClick={onAccept}
          aria-label={t(REFUEL_WORDS[electric ? 'electric' : 'fuel'].add, { name: poi.name })}
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-[color:var(--m-ic)] text-m-ink"
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

/** Where a day ended for the night, or picked back up. Information, not a control. */
export function RtAutoRow({ phase, time, chrome }: {
  phase: 'end' | 'resume'
  time: string | null
  chrome: RowChrome
}) {
  const { t } = chrome
  const Icon = phase === 'end' ? Moon : Sunrise
  return (
    <div className="my-1.5 flex min-h-[38px] items-center gap-2 rounded-[13px] bg-[color:var(--m-ic)] px-[11px] py-[7px]">
      <Icon size={14} strokeWidth={2} className="flex-none text-m-muted" aria-hidden="true" />
      <span className="text-[0.75rem] font-semibold text-m-muted">
        {phase === 'end' ? t('roadtrip.window.stop') : t('roadtrip.window.resume')}
      </span>
      {time && <span className="ms-auto text-[0.8125rem] font-semibold tabular-nums text-m-ink">{time}</span>}
    </div>
  )
}

/**
 * A night drive crossing into this card.
 *
 * The only place a stage shows stops that belong to another day. Without it the
 * traveller counts wrong at a night crossing, because the card opens with stops it
 * does not own.
 */
export function RtSpillRow({ fromDayNumber, departs, chrome, children }: {
  fromDayNumber: number
  departs: string | null
  chrome: RowChrome
  children?: ReactNode
}) {
  const { t } = chrome
  return (
    <div
      className="-mx-1 mb-2 mt-1 overflow-hidden rounded-[16px] border px-3 py-2.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--m-st-info) 26%, transparent)',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--m-st-info) 11%, var(--m-card)) 0%, var(--m-card) 100%)',
      }}
    >
      <div className="flex items-center gap-[6px]">
        <Moon size={13} strokeWidth={2} style={{ color: 'var(--m-st-info)' }} aria-hidden="true" />
        <span className="font-geist text-[0.625rem] font-bold uppercase tracking-[.09em] text-m-muted">
          {t('roadtrip.spill.title', { number: fromDayNumber })}
        </span>
        {departs && (
          <span className="ms-auto text-[0.71875rem] font-semibold tabular-nums text-m-ink">
            {t('roadtrip.spill.departs', { time: departs })}
          </span>
        )}
      </div>
      {children && <div className="mt-1 px-[7px]">{children}</div>}
    </div>
  )
}
