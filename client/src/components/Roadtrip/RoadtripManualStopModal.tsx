import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import Modal from '../shared/Modal'
import CustomSelect from '../shared/CustomSelect'
import { mapsApi } from '../../api/client'
import { useTranslation } from '../../i18n/TranslationContext'
import { useLocationBias } from '../../hooks/useLocationBias'
import { useSettingsStore } from '../../store/settingsStore'
import { formatDistance } from '../../utils/units'
import { FS } from './typeScale'
import type { ManualStopPlace, ManualStopTarget } from './manualStop'
import type { RoadtripRoutes } from './useRoadtripRoutes'

interface RoadtripManualStopModalProps {
  routes: RoadtripRoutes
  /** The day the panel is looking at: where the stop goes while nothing has routed. */
  dayId: number | null
  /** Where a freely chosen point belongs on the drive, from the planner's own projection. */
  targetFor?: (lat: number, lng: number) => ManualStopTarget | null
  onClose: () => void
  /** Hands the place and its position on, so the stop popup asks the kind and the dwell. */
  onSubmit: (place: ManualStopPlace, target: ManualStopTarget) => void
}

/** How long after the last keystroke the search runs. */
const DEBOUNCE_MS = 320
/** Below this, a query matches half a country and the index refuses it as too broad. */
const MIN_QUERY = 3
/**
 * Past this far from the road, the projected leg is worth a second look, in kilometres.
 *
 * The same figure `addRoadtripVia` refuses a click at, and here it only prompts, which
 * is the whole difference between placing a via and adding a stop the search missed.
 */
const OFF_ROUTE_NOTE_KM = 2

/**
 * One row of the place search.
 *
 * The endpoint answers with provider-shaped records (Google and the OSM layer carry
 * different fields), so the contract keeps them as open records and each caller reads
 * what it needs. Narrowed once in `toHit` below rather than carried around untyped.
 */
interface PlaceHit {
  name: string
  address: string | null
  lat: number
  lng: number
  osm_id: string
  website: string | null
  phone: string | null
  category: string | null
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null

/**
 * A search row, or nothing at all.
 *
 * A row without usable coordinates is dropped here instead of at the click: it cannot
 * become a stop, and offering it only to refuse it is a dead end with no explanation.
 */
function toHit(row: Record<string, unknown>): PlaceHit | null {
  // `Number(null)` is 0, and 0/0 is a real coordinate in the Gulf of Guinea: a row with
  // no location at all would otherwise become a stop off the coast of Africa.
  if (row.lat == null || row.lng == null || row.lat === '' || row.lng === '') return null
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const address = text(row.address)
  const name = text(row.name) ?? address
  if (!name) return null
  return {
    name,
    address,
    lat,
    lng,
    // Both providers, in the order the rest of the client reads them.
    osm_id: text(row.osm_id) ?? text(row.google_place_id) ?? '',
    website: text(row.website),
    phone: text(row.phone),
    category: text(row.category),
  }
}

/**
 * Adding a stop the corridor search never found.
 *
 * The search reads OpenStreetMap, and a good share of the chargers actually standing at
 * a motorway junction are not in it, most Tesla Superchargers among them. The way round
 * it was to leave road trip mode, add the place under Days, drag it onto the right day,
 * come back and mark it a charging stop.
 *
 * So this asks the two questions that answer for those four steps (which place, and
 * where on the drive) and then hands over to the same popup a corridor hit goes through.
 * What kind of stop it is and how long it takes are decided there, once, for both paths.
 */
export default function RoadtripManualStopModal({
  routes, dayId, targetFor, onClose, onSubmit,
}: RoadtripManualStopModalProps): React.ReactElement {
  const { t, locale } = useTranslation()
  const distanceUnit = useSettingsStore(s => s.settings.distance_unit)
  // Without a trip context the hint is empty and the search runs as it always has.
  const { point: locationBias } = useLocationBias()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceHit[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [picked, setPicked] = useState<PlaceHit | null>(null)
  const [chosenLeg, setChosenLeg] = useState('')
  const [offRouteKm, setOffRouteKm] = useState<number | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!listOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setListOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [listOpen])

  // Debounced, and with a cancelled flag rather than a bare `.then(setState)`: the
  // endpoint takes no signal, so the only way a stale answer cannot overwrite a newer
  // one is for the run it belongs to to know it has been superseded.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY || trimmed === picked?.name) {
      setResults([])
      setAnswered(false)
      return
    }
    let cancelled = false
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      mapsApi.search(trimmed, locale, locationBias)
        .then(data => {
          if (cancelled) return
          setResults(data.places.map(toHit).filter((hit): hit is PlaceHit => hit !== null))
          setHighlight(-1)
          setAnswered(true)
        })
        .catch(() => {
          if (cancelled) return
          setResults([])
          setAnswered(true)
        })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, picked, locale, locationBias])

  /**
   * Every leg of every routed day, flat.
   *
   * Flat rather than per day because a stop belongs to the drive and not to whichever
   * card the panel happens to be showing: the charger the search missed is as likely to
   * be on tomorrow's stretch as on today's. The labels are the section picker's own:
   * the day carries the number, the leg names the two stops it sits between.
   */
  const legs = useMemo(() => {
    const out: (ManualStopTarget & { value: string; label: string; badge: string })[] = []
    for (const day of routes.days) {
      // A day that has not routed has no order to place anything in.
      if (day.geometry.length < 2) continue
      for (let i = 0; i < day.stops.length - 1; i++) {
        out.push({
          value: `${day.dayId}:${i}`,
          label: t('roadtrip.poi.midLeg', {
            from: day.stops[i]?.name ?? '',
            to: day.stops[i + 1]?.name ?? '',
          }),
          badge: t('roadtrip.day', { number: day.dayNumber }),
          dayId: day.dayId,
          position: i + 1,
          offRouteKm: 0,
        })
      }
    }
    return out
  }, [routes.days, t])

  /**
   * Where it goes while the trip has no drawn route yet: the end of the day the panel is
   * on. No leg is named, because there is no order to name one in.
   */
  const appendTarget = useMemo<ManualStopTarget | null>(() => {
    if (legs.length > 0 || dayId == null) return null
    const day = routes.days.find(d => d.dayId === dayId)
    return { dayId, position: day?.stops.length ?? 0, offRouteKm: 0 }
  }, [legs.length, dayId, routes.days])

  const appendDayNumber = routes.days.find(d => d.dayId === dayId)?.dayNumber ?? 0

  const pick = useCallback((hit: PlaceHit) => {
    setPicked(hit)
    setQuery(hit.name)
    setListOpen(false)
    setResults([])
    const found = targetFor?.(hit.lat, hit.lng) ?? null
    setOffRouteKm(found?.offRouteKm ?? null)
    // The projection is the DEFAULT and never a gate. The charger this dialog exists for
    // is exactly the one sitting a little too far off the line, so a distance that would
    // refuse a via is accepted here and only preselects the leg it landed nearest.
    const match = found && legs.find(l => l.dayId === found.dayId && l.position === found.position)
    // Nothing matching falls back to the first leg, the way an unchosen one already does.
    setChosenLeg(match ? match.value : '')
  }, [targetFor, legs])

  const clearPick = useCallback(() => {
    setPicked(null)
    setQuery('')
    setResults([])
    setAnswered(false)
    setOffRouteKm(null)
    setChosenLeg('')
  }, [])

  /**
   * The leg in force: the one chosen, or the first on offer.
   *
   * Derived rather than seeded into state, so the control always shows a real answer.
   * A dropdown sitting empty under a heading that says "add between" asks a question it
   * has already been given the answer to.
   */
  const leg = legs.some(l => l.value === chosenLeg) ? chosenLeg : (legs[0]?.value ?? '')
  const target = legs.find(l => l.value === leg) ?? appendTarget

  const submit = (): void => {
    if (!picked || !target) return
    onSubmit({
      name: picked.name,
      lat: picked.lat,
      lng: picked.lng,
      address: picked.address,
      website: picked.website,
      phone: picked.phone,
      osm_id: picked.osm_id,
      category: picked.category,
    }, { dayId: target.dayId, position: target.position, offRouteKm: offRouteKm ?? 0 })
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape' && listOpen) {
      // Kept from closing the dialog underneath: the list is what Escape was aimed at.
      e.stopPropagation()
      setListOpen(false)
      return
    }
    if (!listOpen || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault()
      const hit = results[highlight]
      if (hit) pick(hit)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('roadtrip.poi.addManual')}
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[34px] rounded-lg border border-edge bg-surface-card px-3 text-body font-medium text-content transition-colors hover:bg-surface-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!picked || !target}
            className="h-[34px] rounded-lg bg-accent px-3.5 text-body font-semibold text-accent-text transition-opacity disabled:opacity-50"
          >
            {t('common.add')}
          </button>
        </div>
      )}
    >
      <div className="flex flex-col gap-3.5">
        <p className="text-caption text-content-muted">{t('roadtrip.poi.manualHint')}</p>

        <div ref={wrapRef} className="relative">
          <Search size={14} strokeWidth={1.9} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-content-faint" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setListOpen(true)
              if (picked) { setPicked(null); setOffRouteKm(null) }
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={onKey}
            // The dialog exists to be typed into; anything else here is a second step.
            autoFocus
            placeholder={t('places.search')}
            aria-label={t('places.search')}
            className="h-[36px] w-full rounded-[10px] bg-surface-tertiary pe-8 ps-9 text-body text-content placeholder:text-content-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {query ? (
            <button
              type="button"
              onClick={clearPick}
              aria-label={t('common.clear')}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-content-faint transition-colors hover:bg-surface-hover hover:text-content"
            >
              <X size={13} aria-hidden />
            </button>
          ) : null}

          {listOpen && (loading || results.length > 0 || answered) ? (
            <div className="absolute inset-x-0 top-full z-[var(--z-toast)] mt-1 max-h-[240px] overflow-y-auto rounded-xl border border-edge bg-surface-elevated shadow-dropdown">
              {loading && results.length === 0 ? (
                <p className="px-3 py-2.5 text-caption text-content-faint">{t('common.loading')}</p>
              ) : null}
              {!loading && results.length === 0 && answered ? (
                <p className="px-3 py-2.5 text-caption text-content-faint">{t('roadtrip.poi.manualNoResults')}</p>
              ) : null}
              {results.map((hit, i) => (
                <button
                  key={`${hit.osm_id || hit.name}:${hit.lat},${hit.lng}`}
                  type="button"
                  onClick={() => pick(hit)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-start transition-colors ${i === highlight ? 'bg-surface-hover' : ''}`}
                >
                  <MapPin size={12} className="mt-0.5 shrink-0 text-content-faint" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-content" style={{ fontSize: FS.name }}>{hit.name}</span>
                    {hit.address && hit.address !== hit.name ? (
                      <span className="block truncate text-caption text-content-faint">{hit.address}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Where it goes. Preselected from the projection, and changeable: a drive that
            passes the same junction twice can only be guessed at once, and the traveller
            is the one who knows which time they mean to stop.

            Absent altogether when there is nowhere to put anything, rather than an empty
            control: a trip whose days hold fewer than two stops has no drive yet. */}
        {legs.length > 0 || appendTarget ? (
          <div className="flex flex-col gap-2">
            <span className="font-geist font-semibold uppercase tracking-[0.15em] text-content-faint" style={{ fontSize: FS.label }}>
              {t('roadtrip.poi.addBetween')}
            </span>
            {legs.length > 0 ? (
              <CustomSelect
                value={leg}
                onChange={value => setChosenLeg(String(value))}
                options={legs.map(l => ({ value: l.value, label: l.label, badge: l.badge }))}
                size="sm"
                menuFit="content"
              />
            ) : (
              <p className="text-caption text-content-muted">
                {t('roadtrip.poi.manualAppend', { number: appendDayNumber })}
              </p>
            )}
            {/* Said quietly rather than refused. It is the reason the leg above may be the
                wrong one, and the only way the reader can know to change it. */}
            {picked && offRouteKm !== null && offRouteKm > OFF_ROUTE_NOTE_KM ? (
              <p className="text-caption text-warning">
                {t('roadtrip.poi.manualOffRoute', { distance: formatDistance(offRouteKm, distanceUnit) })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
