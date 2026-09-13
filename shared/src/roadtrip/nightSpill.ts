import type { QuietDay, RoadtripDay, RoadtripStop } from './planning-types';
import type { RouteSegment } from './planning-types';
import { computeSchedule, parseClock, type Schedule, hasChosenArrival } from './roadtripModel';

export interface SpillMark {
  automatic?: boolean;

  at: number;

  count: number;

  fromDayNumber: number;

  departure: string | null;

  leg: RouteSegment | undefined;

  fromStop: RoadtripStop | undefined;

  line: [number, number][];
}

export interface SpillChain {
  dayId: number;
  dayNumber: number;
  date: string | null;
  title: string | null;

  stops: RoadtripStop[];

  schedule: Schedule;

  spills: SpillMark[];
}

type PlanDay = Pick<RoadtripDay, 'dayId' | 'dayNumber' | 'date' | 'title' | 'stops'>;

type LegLookup = (from: RoadtripStop, to: RoadtripStop) => { seg: RouteSegment; line: [number, number][] } | undefined;

interface Placed {
  stop: RoadtripStop;
  arrival: string | null;
  departure: string | null;

  dayOffset: number;

  codes: ('late' | 'overnight' | 'leg' | 'range')[];
  lateMinutes: number | null;

  fromDayNumber: number | null;
  departedAt: string | null;
  leg: RouteSegment | undefined;
  line: [number, number][];
  from: RoadtripStop | undefined;
}

/**
 * The minute each day is free to start on, for the days a booking still holds.
 *
 * A night booked into the next morning does not end at midnight: the room is given
 * back at check-out, and until then the traveller is at the hotel and not at the
 * first stop of the new day. Without this each day was scheduled from nothing, so a
 * stop pinned before check-out read as perfectly fine.
 *
 * Only the day the check-out falls in. A stay running Monday to Thursday leaves
 * Tuesday and Wednesday alone, which is the point: you sleep there, you do not sit
 * there. And the bound is a floor, never a move. A stop with a clock of its own
 * keeps it and collects the late warning any leg it cannot make would give it.
 */
export function earliestFreeMinute(days: PlanDay[]): Map<number, number> {
  const held = new Map<number, number>();
  for (const day of days) {
    for (const stop of day.stops) {
      if (stop.checkoutAt === undefined) continue;
      const checkoutDay = Math.floor(stop.checkoutAt / 1440);
      // A check-out on the stop's own day binds nothing: that is a day trip, and the
      // stops after it already follow through the leg chain.
      if (checkoutDay <= day.dayNumber) continue;
      const minute = stop.checkoutAt - checkoutDay * 1440;
      held.set(checkoutDay, Math.max(held.get(checkoutDay) ?? 0, minute));
    }
  }
  return held;
}

export function spillChains(plan: PlanDay[], quietDays: QuietDay[], legFor: LegLookup): SpillChain[] {
  const all: PlanDay[] = [
    ...plan,
    ...quietDays.map((d) => ({
      dayId: d.dayId,
      dayNumber: d.dayNumber,
      date: d.date,
      title: d.title,
      stops: d.stops,
    })),
  ].sort((a, b) => a.dayNumber - b.dayNumber);
  const numbers = new Set(all.map((d) => d.dayNumber));
  const heldUntil = earliestFreeMinute(all);
  const landing = new Map<number, Placed[]>();
  for (const d of all) landing.set(d.dayNumber, []);

  for (const d of all) {
    const routed = d.stops.slice(0, -1).map((s, i) => legFor(s, d.stops[i + 1]!));
    const legs = routed.map((l) => l?.seg);
    const schedule = computeSchedule(
      d.stops.map((s) => ({
        anchor: s.time ?? s.checkInTime ?? null,
        dwellMinutes: s.dwellMinutes,
        departureAt: s.checkoutAt === undefined ? undefined : s.checkoutAt - d.dayNumber * 1440,
      })),
      legs.map((l) => l?.duration),
      { notBefore: heldUntil.get(d.dayNumber) ?? null },
    );

    let day = 0;
    let previous: number | null = null;
    d.stops.forEach((stop, i) => {
      const entry = schedule.entries[i]!;
      const clock = parseClock(entry?.arrival);
      if (clock !== null) {
        if (previous !== null && clock < previous) day += 1;
        previous = clock;
      }
      const offset = d.stops.some((s) => s.checkoutAt !== undefined) ? (entry?.dayOffset ?? day) : day;
      const marks = schedule.warnings.filter((w) => w.index === i);

      const reachable = offset > 0 && numbers.has(d.dayNumber + offset);
      const target = reachable ? d.dayNumber + offset : d.dayNumber;
      const moved = target !== d.dayNumber;
      landing.get(target)?.push({
        stop,
        arrival: entry?.arrival ?? null,
        departure: entry?.departure ?? null,

        dayOffset: moved ? 0 : offset,

        codes: marks.map((w) => w.code).filter((c) => !(moved && c === 'overnight')),
        lateMinutes: marks.find((w) => w.code === 'late')?.minutes ?? null,
        fromDayNumber: moved ? d.dayNumber : null,
        departedAt: moved ? (schedule.entries[i - 1]?.departure ?? null) : null,
        leg: moved ? legs[i - 1] : undefined,
        line: moved ? (routed[i - 1]?.line ?? []) : [],
        from: moved ? d.stops[i - 1]! : undefined,
      });
    });
  }

  const out: SpillChain[] = [];
  for (const d of all) {
    const placed = landing.get(d.dayNumber) ?? [];
    if (!placed.length) continue;

    placed.sort((a, b) => (a.fromDayNumber ?? Number.MAX_SAFE_INTEGER) - (b.fromDayNumber ?? Number.MAX_SAFE_INTEGER));
    const spills: SpillMark[] = [];
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i]!;
      if (p.fromDayNumber === null) continue;
      const last = spills[spills.length - 1]!;
      if (last && last.fromDayNumber === p.fromDayNumber && last.at + last.count === i) last.count += 1;
      else
        spills.push({
          at: i,
          count: 1,
          fromDayNumber: p.fromDayNumber,
          departure: p.departedAt,
          leg: p.leg,
          line: p.line,
          fromStop: p.from,
        });
    }
    out.push({
      dayId: d.dayId,
      dayNumber: d.dayNumber,
      date: d.date,
      title: d.title,
      stops: placed.map((p) => p.stop),
      schedule: {
        entries: placed.map((p) => ({
          arrival: p.arrival,
          departure: p.departure,
          anchored: hasChosenArrival(p.stop),
          dayOffset: p.dayOffset,
        })),
        warnings: placed.flatMap((p, i) =>
          p.codes.map((code) =>
            code === 'late' ? { index: i, code, minutes: p.lateMinutes ?? 0 } : { index: i, code },
          ),
        ),
      },
      spills,
    });
  }
  return out;
}
