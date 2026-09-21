import { Bus, Plane, Sailboat, Ship, Train, type LucideIcon } from 'lucide-react'
import { formatDurationShort } from './roadtripModel'
import { formatClockTime } from '../../utils/formatters'
import type { CarrierTerminal, RouteSegment } from '@trek/shared/roadtrip'
import type { TranslationFn } from '../../types'

/**
 * How a ride and its two terminals read on the rail and in the phone chain (#2428).
 *
 * One module for both shells, because the two would otherwise carry the same icon table
 * and the same three sentences each, and the duplication budget does not stretch to that.
 * The icons are the booking panel's for the same types, so a flight looks like a flight
 * wherever the trip shows it.
 */
const CARRIER_ICON: Record<string, LucideIcon> = {
  flight: Plane,
  train: Train,
  ferry: Sailboat,
  cruise: Ship,
  bus: Bus,
}

export function carrierIcon(type: string): LucideIcon {
  return CARRIER_ICON[type] ?? Plane
}

/**
 * The line under a terminal's name: the timetable's clock at it, in the reader's own
 * clock format. Nothing when the booking names no time.
 */
export function terminalLine(carrier: CarrierTerminal, t: TranslationFn, is12h: boolean): string | null {
  if (!carrier.at) return null
  const time = formatClockTime(carrier.at, is12h)
  return carrier.role === 'departure' ? t('roadtrip.ride.departure', { time }) : t('roadtrip.ride.arrival', { time })
}

/**
 * What the ride's pill says: the booking, then how long it takes when the timetable gives
 * both ends. A ride with no minutes is still the booking, and says so without a duration.
 */
export function rideText(carrier: CarrierTerminal, seg: RouteSegment | undefined): string {
  const seconds = seg && Number.isFinite(seg.duration) ? seg.duration : 0
  const duration = seg?.durationText || (seconds > 0 ? formatDurationShort(seconds) : '')
  return duration ? `${carrier.title} · ${duration}` : carrier.title
}
