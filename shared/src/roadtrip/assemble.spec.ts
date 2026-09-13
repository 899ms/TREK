/**
 * ROADTRIP-ASSEMBLE-001..003 — what the assembler does with the model's warnings.
 *
 * The model itself is pinned by roadtripModel.spec.ts. This file pins the
 * wrapper, which is where the arguments are chosen: `deriveDriveWarnings` takes
 * a two-slot "does this stop refuel" pair, slot 0 for the stop the leg leaves
 * and slot 1 for the stop it arrives at, and the assembler hard-coded slot 1 to
 * false. The suppression the model was written for could therefore never fire
 * through it, so a day that stops at a charger 700 km in reported running dry
 * at the charger, and a run of warnings that should collapse to one did not.
 */
import { assembleRoadtrip } from './assemble';
import type { PlanDay, RoadtripStop, RoutedLeg } from './planning-types';

import { describe, it, expect } from 'vitest';

const stop = (over: Partial<RoadtripStop> & { ownerIndex: number }): RoadtripStop => ({
  assignmentId: 100 + over.ownerIndex,
  ownerDayId: 1,
  placeId: 200 + over.ownerIndex,
  name: `Stop ${over.ownerIndex}`,
  lat: 50 + over.ownerIndex,
  lng: 10,
  time: null,
  dwellMinutes: null,
  legMode: null,
  incomingLegMode: null,
  stopType: null,
  ...over,
});

const leg = (km: number): RoutedLeg => ({
  seg: {
    mid: [50, 10],
    from: [50, 10],
    to: [51, 10],
    distance: km * 1000,
    duration: km * 40,
    walkingText: '',
    drivingText: '',
    distanceText: `${km} km`,
    mode: 'driving',
  },
  line: [
    [50, 10],
    [51, 10],
  ],
  vias: [],
});

const stopKey = (s: RoadtripStop): string =>
  `${s.lat.toFixed(5)},${s.lng.toFixed(5)},${s.legMode ?? ''},${s.incomingLegMode ?? ''}`;
const legKey = (from: RoadtripStop, to: RoadtripStop): string => `${stopKey(from)}>${stopKey(to)}`;

function assemble(stops: RoadtripStop[], legs: number[]) {
  const day: PlanDay = { dayId: 1, dayNumber: 1, date: '2026-06-01', title: null, stops };
  const allLegs: Record<string, RoutedLeg> = {};
  legs.forEach((km, i) => {
    allLegs[legKey(stops[i], stops[i + 1])] = leg(km);
  });
  return assembleRoadtrip({
    plan: [day],
    quietDays: [],
    window: null,
    distanceUnit: 'km',
    allLegs,
    snapByDay: {},
    missedByDay: {},
    loading: false,
    // 600 km on a full battery, and no daily driving ceiling to muddy the warnings.
    limits: { rangeKm: 600 },
    vehicleKind: 'electric',
    connectDays: false,
    boundaries: [],
    labels: { start: 'start', end: 'end' },
  });
}

const rangeWarnings = (routes: ReturnType<typeof assemble>) =>
  routes.days[0].driveWarnings.filter((w) => w.code === 'range');

describe('assembleRoadtrip drive warnings', () => {
  it('ROADTRIP-ASSEMBLE-001: a charger at the end of an out-of-range leg answers for it', () => {
    const stops = [stop({ ownerIndex: 0 }), stop({ ownerIndex: 1, stopType: 'charging' })];

    expect(rangeWarnings(assemble(stops, [700]))).toEqual([]);
  });

  it('ROADTRIP-ASSEMBLE-002: an ordinary stop at the end of the same leg still warns', () => {
    const stops = [stop({ ownerIndex: 0 }), stop({ ownerIndex: 1 })];

    // The warning belongs to the stop the leg reaches, which is where the
    // traveller would be standing when the battery ran out.
    expect(rangeWarnings(assemble(stops, [700]))).toEqual([expect.objectContaining({ index: 1 })]);
  });

  it('ROADTRIP-ASSEMBLE-003: the budget resets at the charger, so the leg after it is measured fresh', () => {
    const stops = [stop({ ownerIndex: 0 }), stop({ ownerIndex: 1, stopType: 'charging' }), stop({ ownerIndex: 2 })];

    // 500 after a charge is inside a 600 km range, however far the day drove
    // before it.
    expect(rangeWarnings(assemble(stops, [700, 500]))).toEqual([]);
  });
});
