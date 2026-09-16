import { useEffect, useMemo, useState } from 'react'
import { destinationCount, roadtripRows, stageOf, upNextStop } from '../../../../components/Roadtrip/roadtripRowModel'
import { useRoadtripSettings } from '../../../../hooks/useRoadtripSettings'
import { useSettingsStore } from '../../../../store/settingsStore'
import { isEffectivelyOffline, onNetworkModeChange } from '../../../../sync/networkMode'
import type { RoadtripDay } from '@trek/shared/roadtrip'
import type { TripPlanner } from '../MTripShell'
import type { RoadtripRow } from '../../../../components/Roadtrip/roadtripRowModel'

/** Minutes since midnight, local time. */
const nowMinutes = (): number => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** The same 30 s tick the day timeline runs on, so the two never disagree by a minute. */
const TICK_MS = 30_000

export interface MRoadtripController {
  stage: RoadtripDay | null
  rows: RoadtripRow[]
  stops: number
  /** True while the routing round is still working through the trip's days. */
  loading: boolean
  /** The trip has the addon on but nothing routable: one place on a day is not a drive. */
  empty: boolean
  offline: boolean
  electric: boolean
  /** Next destination the plan still owes, today only. Negative minutesUntil is late. */
  upNext: ReturnType<typeof upNextStop>
  isToday: boolean
}

/**
 * Everything the stage screen needs, kept out of its markup.
 *
 * The clock is the only moving part: a screen that shows a morning's plan all day
 * quietly lies once you leave twenty minutes late, and the fix is arithmetic on the
 * schedule rather than a request. Nothing here asks the network for anything.
 */
export function useMRoadtrip(planner: TripPlanner): MRoadtripController {
  const { roadtripRoutes, selectedDayId, days } = planner
  const vehicle = useRoadtripSettings(s => s.roadtrip_vehicle, planner.tripId)
  const [minutes, setMinutes] = useState(nowMinutes)
  const [offline, setOffline] = useState(isEffectivelyOffline)

  useEffect(() => {
    const id = window.setInterval(() => setMinutes(nowMinutes()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => onNetworkModeChange(() => setOffline(isEffectivelyOffline())), [])

  const stage = useMemo(
    () => stageOf(roadtripRoutes.days, selectedDayId),
    [roadtripRoutes.days, selectedDayId],
  )

  const rows = useMemo(() => (stage ? roadtripRows(stage) : []), [stage])

  // "Today" is the stage's own date, not the selected day's index: a trip can be
  // planned for next year, and a countdown on a day in March is noise.
  const isToday = useMemo(() => {
    const date = days.find(d => d.id === selectedDayId)?.date
    if (!date) return false
    return date.slice(0, 10) === new Date().toISOString().slice(0, 10)
  }, [days, selectedDayId])

  return {
    stage,
    rows,
    stops: stage ? destinationCount(stage) : 0,
    loading: roadtripRoutes.loading,
    empty: !roadtripRoutes.loading && roadtripRoutes.days.length === 0,
    offline,
    electric: vehicle === 'electric',
    upNext: upNextStop(stage, minutes, isToday),
    isToday,
  }
}

/** The trip's own distance unit, for every figure the stage prints. */
export function useDistanceUnit() {
  return useSettingsStore(s => s.settings.distance_unit)
}

/** Kept for the tick's identity in tests. */
export const ROADTRIP_TICK_MS = TICK_MS
