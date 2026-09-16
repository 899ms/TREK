import { isServiceStopType, type ScheduleEntry, type ScheduleWarning } from './roadtripModel'
import type { RoadtripDay, RoadtripStop, RouteSegment } from '@trek/shared/roadtrip'

/**
 * A road trip day, flattened into the rows a screen draws, with no React in sight.
 *
 * The rail builds its rows inline while it renders, which is fine for a panel that only
 * ever exists once. The phone draws the same chain in a second shell, and the two would
 * drift the first time a rule changed, and the duplication budget does not stretch to
 * the same forty lines of branching twice. So the branching lives here: what is a row,
 * in which order, and which of a stop's findings survives the two marks a 375px line can
 * carry.
 *
 * Deliberately free of React, translations and formatting. It answers "what is on this
 * line", never "how does it read", so it can be unit tested on its own and so the same
 * answer can be drawn twice in two different design languages.
 */

export type RoadtripRow =
  | { kind: 'spill'; fromDayNumber: number; departs: string | null; stops: StopRow[] }
  | StopRow
  | { kind: 'leg'; index: number; seg: RouteSegment | undefined; mode: string | null }
  | { kind: 'dry'; legIndex: number; intoLegKm: number; sinceKm: number }
  | { kind: 'auto'; phase: 'end' | 'resume'; time: string | null }

export interface StopRow {
  kind: 'stop'
  stop: RoadtripStop
  /** Position in the day's numbering, or null for a service stop and an automatic night. */
  number: number | null
  service: boolean
  entry: ScheduleEntry | undefined
  /** The clock this row shows on the right: when the traveller gets there. */
  time: string | null
  /** When they leave again, which is arrival plus the stay. Null without a schedule. */
  departure: string | null
  /** True when a person pinned that time, which is what the pin in front of it means. */
  pinned: boolean
  /** At most two marks fit a 375px row. This is the one warning that earned the second. */
  warning: ScheduleWarning | null
  dwellMinutes: number | null
  offRoadMeters: number | null
}

/**
 * Which finding wins when a stop has several.
 *
 * The desktop stacks all of them, which is honest on a 420px rail and unreadable on a
 * phone. The order is by what changes the next decision soonest: being late moves every
 * arrival after it, running dry strands the car, and an over-long leg is a planning
 * remark you can act on tonight.
 */
const WARNING_RANK: Record<ScheduleWarning['code'], number> = {
  late: 0,
  range: 1,
  leg: 2,
  overnight: 3,
}

export function pickWarning(warnings: readonly ScheduleWarning[]): ScheduleWarning | null {
  let best: ScheduleWarning | null = null
  for (const w of warnings) {
    if (!best || WARNING_RANK[w.code] < WARNING_RANK[best.code]) best = w
  }
  return best
}

/** The one day a phone screen shows, picked from what the routing round produced. */
export function stageOf(days: readonly RoadtripDay[], dayId: number | null): RoadtripDay | null {
  if (dayId == null) return null
  return days.find(d => d.dayId === dayId) ?? null
}

function stopRow(
  stop: RoadtripStop,
  index: number,
  number: number | null,
  schedule: RoadtripDay['schedule'],
  driveWarnings: readonly ScheduleWarning[],
): StopRow {
  // Only ever called for a real stop: an automatic night is the shell's own marker
  // for "the day ended here" and `roadtripRows` turns it into an 'auto' row instead.
  const entry = schedule.entries[index]
  const mine = driveWarnings.filter(w => w.index === index)
  return {
    kind: 'stop',
    stop,
    number,
    service: isServiceStopType(stop.stopType),
    entry,
    time: entry?.arrival ?? null,
    departure: entry?.departure ?? null,
    pinned: !!entry?.anchored,
    warning: pickWarning(mine),
    dwellMinutes: stop.dwellMinutes,
    offRoadMeters: stop.offRoadMeters ?? null,
  }
}

/**
 * The rows of one day, in the order they are drawn.
 *
 * Two things here are easy to get wrong and both have a test:
 *
 * 1. Numbering counts destinations only. A petrol station between stop two and stop
 *    three does not make the next one four, and neither does the marker that ends the
 *    day. Numbering off the array index gets both wrong.
 * 2. `ownerDayId` is the day a stop is STORED on, which after a night drive is not the
 *    card it is drawn on. The rows follow the card, because that is what the traveller
 *    reads, and anything writing back has to use `ownerDayId` instead.
 */
export function roadtripRows(day: RoadtripDay): RoadtripRow[] {
  const rows: RoadtripRow[] = []
  const spills = day.spills ?? []

  let number = 0
  day.stops.forEach((stop, i) => {
    const spill = spills.find(s => s.at === i)
    if (spill) {
      rows.push({
        kind: 'spill',
        fromDayNumber: spill.fromDayNumber,
        departs: spill.departure,
        stops: [],
      })
    }

    const automatic = !!stop.automaticNight
    if (automatic) {
      rows.push({
        kind: 'auto',
        phase: stop.automaticNight?.phase === 'start' ? 'resume' : 'end',
        time: day.schedule.entries[i]?.arrival ?? null,
      })
    } else {
      if (!isServiceStopType(stop.stopType)) number += 1
      rows.push(stopRow(stop, i, isServiceStopType(stop.stopType) ? null : number, day.schedule, day.driveWarnings))
    }

    // The leg AFTER this stop, plus the dry point that falls on it. Both belong
    // between two stops, so they are emitted here rather than in their own pass.
    const seg = day.legs[i]
    if (i < day.stops.length - 1) {
      rows.push({ kind: 'leg', index: i, seg, mode: day.stops[i + 1]?.incomingLegMode ?? stop.legMode ?? null })
      const dry = (day.dryPoints ?? []).find(p => p.legIndex === i)
      if (dry) {
        rows.push({ kind: 'dry', legIndex: i, intoLegKm: dry.intoLegKm, sinceKm: dry.sinceKm })
      }
    }
  })

  return rows
}

/** Stops that carry a number, for a count that agrees with the numbering above. */
export function destinationCount(day: RoadtripDay): number {
  return day.stops.filter(s => !s.automaticNight && !isServiceStopType(s.stopType)).length
}

/**
 * The two clocks a stage is headed with: when it starts, and when you reach its last place.
 *
 * Both are read off the clock the rows print on the right, which is an arrival all the way
 * down (the desktop rail keeps the same rule and spells a departure out in words where it
 * needs one). So each figure is one the chain below repeats, and the start is the first
 * stop's ARRIVAL rather than the moment you leave it. A first stop is a place you get to,
 * often at a time somebody pinned, and heading the card with its departure hid that
 * appointment behind its own stay: a stop pinned at 10:00 with an hour and a half there
 * read as leaving at 11:30, a clock no row shows.
 *
 * A resume point is a start, because the morning after an automatic night begins there. A
 * day end point is not an arrival: it marks where the window closed, not a place. A spill
 * band is passed over, because the departure it carries belongs to the day before.
 *
 * Stops without a clock are skipped at both ends instead of dashing the figure. That only
 * happens while a leg between them and the timed stops has no route yet, and a partly timed
 * day still has a first and a last clock worth reading, even when both are the same stop's.
 *
 * First and last mean row order, not the earliest and the latest clock, because the column
 * is not guaranteed to run forwards. A pin the drive cannot make keeps its own clock, so it
 * can read earlier than the stop above it. And when a daily window cannot be kept, each
 * stored day is timed on its own without being split, so a card can open on an evening stay
 * and end on a pin the next morning. The figures follow the rows in both cases, so they
 * never name a clock the chain does not.
 */
export function stageClocks(rows: readonly RoadtripRow[]): { start: string | null; arrive: string | null } {
  let start: string | null = null
  let arrive: string | null = null
  for (const row of rows) {
    if (row.kind === 'stop' && row.time) {
      start ??= row.time
      arrive = row.time
    } else if (row.kind === 'auto' && row.phase === 'resume' && row.time) {
      start ??= row.time
    }
  }
  return { start, arrive }
}

/**
 * The next destination the plan still owes you, measured against the clock.
 *
 * Only for today: a countdown on a day in March is noise. `minutesUntil` goes
 * NEGATIVE once that stop's planned time has passed, and that negative number is
 * the only honest statement about running late this screen can make. There is no
 * position source, so the app cannot know whether the stop was reached; what it
 * can say is that the plan said 10:45 and it is now 11:21.
 *
 * Null once the last stop's time is past: a screen still saying "next" after the
 * driving is done is worse than one saying nothing.
 */
export function upNextStop(
  day: RoadtripDay | null,
  nowMinutes: number,
  isToday: boolean,
): { row: StopRow; minutesUntil: number } | null {
  if (!day || !isToday) return null
  const timed = roadtripRows(day)
    .filter((r): r is StopRow => r.kind === 'stop' && !r.service)
    .map(row => ({ row, at: clockMinutes(row.time) }))
    .filter((x): x is { row: StopRow; at: number } => x.at != null)
  if (!timed.length) return null

  const ahead = timed.find(x => x.at >= nowMinutes)
  if (ahead) return { row: ahead.row, minutesUntil: ahead.at - nowMinutes }

  // Everything is past. The last one is only still "next" while the day has not
  // run out entirely, which we take as its planned time plus the hour after it.
  const last = timed[timed.length - 1]
  const overdue = nowMinutes - last.at
  return overdue <= 60 ? { row: last.row, minutesUntil: -overdue } : null
}

function clockMinutes(time: string | null): number | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}
