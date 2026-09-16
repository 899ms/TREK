import { useMemo, useState } from 'react'
import { MapViewAuto } from '../../../../components/Map/MapViewAuto'
import { MapCompassPill, type CompassMap } from '../../../../components/Map/MapCompassPill'
import { MAP_LAYER_SWITCHER_INSET, MAP_ROUND_CONTROL_SIZE } from '../../../../components/Map/MapLayerSwitcher'
import { TripRouteOverviewPill, TripRouteOverviewPanel } from '../../../../components/Map/TripRouteOverview'
import { DawarichTrailPill } from '../../../../components/Map/DawarichTrailPill'
import PoiCategoryPill from '../../../../components/Map/PoiCategoryPill'
import { usePoiExplore } from '../../../../components/Map/usePoiExplore'
import { useMergedMapPois } from '../../../../components/Map/useMergedMapPois'
import { stageOf } from '../../../../components/Roadtrip/roadtripRowModel'
import { stageMapData } from '../../../../components/Roadtrip/stageMap'
import { useRoadtripSettings } from '../../../../hooks/useRoadtripSettings'
import { useSettingsStore } from '../../../../store/settingsStore'
import type { MMapAreaProps } from '../MTripShell'
import type { Poi } from '../../../../components/Map/poiCategories'

/** One array, so an explore set switched off does not move every pin on the stage. */
const NO_POIS: Poi[] = []

/**
 * The compass stands one gap to the right of the base-layer switcher both engines draw
 * in the bottom left corner. Worked out from the switcher's own numbers rather than
 * written down as 70, so moving or resizing the switcher carries the compass along.
 */
const COMPASS_LEFT = MAP_LAYER_SWITCHER_INSET + MAP_ROUND_CONTROL_SIZE + 8

/**
 * Fullscreen map layer of the mobile trip screen (plan tab). Stays mounted for
 * the whole plan-tab lifetime — the plan timeline / places browser overlays
 * simply cover it — so tiles, markers and the GL engine stay warm across view
 * toggles.
 *
 * The map itself is the shared planner renderer (Leaflet or GL, per user
 * setting) with the full desktop feature set: clusters, photo/icon markers,
 * day-order badges, dashed day route, transport overlays per booking, POI
 * explore markers and long-press → add place. Only the floating chrome is
 * mobile: the POI bar spans the full width below the day-chip rail, and the round
 * controls share the band just above the dock: the map's own base-layer switcher
 * with the compass beside it on the left, the map's built-in three-state locate
 * button on the right, all riding the --bottom-nav-h contract the map already reads
 * so they cannot drift apart.
 *
 * Marker data honours the shared places category filter (#1541) because
 * planner.mapPlaces is derived from tripStore's placesCategoryFilter — the
 * same set the places browser renders, so the two can't desync.
 */
export default function MMapArea({ planner, shell }: MMapAreaProps) {
  const poi = usePoiExplore()
  const [glMap, setGlMap] = useState<CompassMap | null>(null)
  const poiPillEnabled = useSettingsStore(s => s.settings.map_poi_pill_enabled) !== false
  const distanceUnit = useSettingsStore(s => s.settings.distance_unit)

  const dayColorsOn = useRoadtripSettings(s => s.roadtrip_day_colors, planner.tripId)

  // One instance, two tabs. `mapFront` is true whenever the map is the front layer
  // in either of them, so the floating chrome below keys off that rather than off
  // `view`, which only ever meant the plan tab.
  const mapActive = shell.mapFront
  const onStage = shell.trTab === 'roadtrip'

  // The stage the road trip tab is looking at, and what the map draws for it. Passed
  // through unconditionally while that tab is open, list half included: `focusPoints`
  // going array → undefined → array is two dependency changes to React, and the
  // second one would throw away whatever the traveller had panned to.
  //
  // Memoised on what the stage is made of rather than rebuilt per render: the shell
  // re-renders on every store write, a settings toggle included, and a fresh
  // `focusPoints` array reframes the camera while fresh lines and places set their
  // GeoJSON sources again. On the stage that also kept the GL style busy, which is how
  // the satellite switch came to miss every tap there.
  const stage = useMemo(
    () => onStage ? stageOf(planner.roadtripRoutes.days, planner.selectedDayId) : null,
    [onStage, planner.roadtripRoutes.days, planner.selectedDayId],
  )
  const stageMap = useMemo(
    () => onStage ? stageMapData(planner.roadtripRoutes, stage, !!dayColorsOn) : null,
    [onStage, planner.roadtripRoutes, stage, dayColorsOn],
  )

  // Only what the stage carries, so a trip's other 200 pins stay off a screen that
  // is answering one question. Without a stage (the all-days view) every planned
  // place comes back, which is what the drive looks like end to end.
  const stagePlaces = useMemo(
    () => stageMap && stage
      ? planner.mapPlaces.filter(p => stageMap.placeIds.has(p.id))
      : planner.roadtripMapPlaces,
    [stageMap, stage, planner.mapPlaces, planner.roadtripMapPlaces],
  )

  /**
   * The pins, and they are not the same question on the two tabs.
   *
   * On the stage: what the corridor search found and what the fuel search is offering,
   * both measured along the drive. The explore categories stay off it, and so does their
   * bar. "What is around this piece of map" has no relationship to a route, and two
   * search bars stacked over a 375px map is the clutter this tab exists to avoid. The
   * plan tab is one tap away and shows the same map.
   *
   * Merged through the planner's own hook rather than concatenated here, because the
   * sets overlap: the same petrol station found twice would be two pins on one roof.
   */
  const pois = useMergedMapPois(
    onStage ? planner.roadtripCorridor.visible : null,
    onStage ? NO_POIS : poi.pois,
    planner.refuel.offered,
  )

  return (
    // `isolate` keeps the map's internal z-indexes (Leaflet panes, the z-1000
    // locate button) inside this layer so they can never paint over the plan
    // timeline (z-10) or the browse/tab overlays (z-30) above it.
    // The dock is 62px tall at safe-bottom + 12, so a 74px --bottom-nav-h puts
    // the round controls (which add their own 12px) a dock's gap above it —
    // close enough to the thumb to reach one-handed, clear of the dock itself.
    // The stage bar takes the band the round controls normally sit in, so on that
    // tab they move up by its height plus its own gap. The lift is its OWN variable
    // folded into the class rather than an inline --bottom-nav-h: the compass band
    // below is identified by being the one element that sets that name inline, and a
    // second one would make that ambiguous.
    <div
      className="absolute inset-0 isolate overflow-hidden bg-[color:var(--m-mapb)] [--bottom-nav-h:calc(env(safe-area-inset-bottom,0px)+74px+var(--m-stage-lift,0px))]"
      // 76px is the stage bar's own height plus the gap it keeps on both sides, so the
      // round controls land one gap above it instead of on its top edge.
      style={{ ['--m-stage-lift' as string]: onStage && mapActive ? '76px' : '0px' }}
    >
      <MapViewAuto
        tripId={planner.tripId}
        dawarichTrack={planner.dawarichTrail.track}
        places={stageMap ? stagePlaces : planner.mapPlaces}
        dayPlaces={onStage ? undefined : planner.dayPlaces}
        route={stageMap ? stageMap.lines : planner.overviewActive ? planner.tripOverview.lines : planner.route}
        routeColors={stageMap ? stageMap.lineColors : planner.overviewActive ? planner.tripOverview.lineColors : undefined}
        accessLines={stageMap ? stageMap.accessLines : undefined}
        // A hit somebody tapped in the search sheet, or the stations the fuel search is
        // offering, take the camera; with nothing pending the stage frames itself.
        focusPoints={stageMap
          ? (planner.mapFocusPoints.length ? planner.mapFocusPoints : stageMap.focusPoints)
          : planner.overviewActive ? planner.tripOverview.focusPoints : undefined}
        routeVias={onStage ? planner.roadtripMapVias : planner.routeVias}
        showTransitRoutes={onStage ? false : planner.transitRoutesShown}
        // The route toggle belongs to one day, so the map needs that day to know
        // which automated transports may ride it (#2019).
        days={planner.days}
        selectedDayId={planner.selectedDayId}
        routeSegments={onStage ? undefined : planner.overviewActive ? planner.tripOverview.segments : planner.routeSegments}
        selectedPlaceId={planner.selectedPlaceId}
        onMarkerClick={planner.handleMarkerClick}
        // Tap on empty map = deselect, same contract as desktop.
        onMapClick={planner.handleMapClick}
        // The chip rail names a day at all times on mobile, so a place dropped on
        // the map belongs to it — the desktop map has no such context and passes
        // nothing, which keeps its pool behaviour (#1998).
        onMapContextMenu={e => planner.handleMapContextMenu(e, planner.selectedDayId)}
        // No center/zoom: the map frames itself on the trip's places at mount.
        tileUrl={planner.mapTileUrl}
        fitKey={planner.fitKey}
        dayOrderMap={planner.dayOrderMap}
        reservations={planner.reservations}
        showReservationStats={true}
        visibleConnectionIds={planner.visibleConnections}
        // Transport overlay tap → the mobile transport detail sheet (desktop
        // routes this through mapTransportDetail into the day sidebar instead).
        onReservationClick={(rid: number) => shell.openSheet('transport', { reservationId: rid })}
        pois={pois}
        // On the stage, through the road trip's own door: it recognises a corridor hit by
        // the distance it carries and sends it to the draft sheet with the stop kind, the
        // stay and the position in the chain already worked out. The plan tab has no
        // chain to place anything in, so there it stays the plain place form.
        onPoiClick={onStage
          ? planner.handlePoiClick
          : marker => planner.openAddPlaceFromPoi(marker, planner.selectedDayId)}
        onViewportChange={poi.onViewportChange}
        onMapReady={setGlMap}
      />

      {/* Floating map chrome — only while the map view is front-most. The POI bar
          sits below the day-chip rail (safe-top + 50px + ~42px chip height) and
          takes the full width between the screen margins, so its segments are
          the same size as everything else the thumb aims at on this screen. */}
      {mapActive && !onStage && poiPillEnabled && (
        <div className="pointer-events-none absolute left-4 right-4 z-[25] flex flex-col items-center gap-2 top-[calc(var(--m-safe-top,12px)+96px)]">
          <PoiCategoryPill
            fullWidth
            active={poi.active}
            onToggle={poi.toggle}
            loadingKeys={poi.loadingKeys}
            errorKeys={poi.errorKeys}
            moved={poi.moved}
            onSearchArea={poi.searchArea}
          />
        </div>
      )}

      {/* Compass, GL maps only (Leaflet cannot rotate). Both engines draw the base-layer
          switcher in the bottom left corner, so the compass sits beside it rather than in
          the corner: at `left-3` it started 8px left of the switcher and ran on under it,
          reading as a second button showing through the frosted shell. Same
          --bottom-nav-h band as the locate button's `right: 12`, so the round controls
          still share one line. The left offset is inline because it is computed from the
          switcher's own numbers. */}
      {mapActive && glMap && (
        <div className="pointer-events-none absolute z-[25]" style={{ left: COMPASS_LEFT, bottom: 'calc(var(--bottom-nav-h, 84px) + 12px)' }}>
          <MapCompassPill map={glMap} />
        </div>
      )}

      {/* Whole-trip overview (#1736): the stages stack above their toggle on the right,
          clear of the round-controls band below it and of the base-layer switcher and
          the compass, which both sit bottom left. The offset is Tailwind rather than
          inline because the compass band is identified by being the one element with
          an inline --bottom-nav-h, and a second would make that ambiguous. */}
      {mapActive && !onStage && (!planner.roadtripActive || planner.dawarichEnabled) && (
        <div className="pointer-events-none absolute left-3 right-3 z-[25] flex flex-col items-end gap-2 bottom-[calc(var(--bottom-nav-h,84px)+58px)]">
          {!planner.roadtripActive && planner.overviewActive && (
            <TripRouteOverviewPanel
              overview={planner.tripOverview}
              unit={distanceUnit}
              selectedDayId={planner.selectedDayId}
              onSelectDay={planner.handleSelectDay}
              // Tighter than the desktop card: the map is the whole screen here, so a
              // long day name ellipsizes rather than eating another 80px of it.
              maxWidth={240}
            />
          )}
          {!planner.roadtripActive && (
            <TripRouteOverviewPill active={planner.overviewShown} onToggle={planner.toggleOverview} />
          )}
          {/* Kept in road-trip mode: the recorded route beside the planned one is
              exactly the comparison a drive invites. */}
          {planner.dawarichEnabled && (
            <DawarichTrailPill
              active={planner.dawarichTrailShown}
              status={planner.dawarichTrail.status}
              onToggle={planner.toggleDawarichTrail}
            />
          )}
        </div>
      )}
    </div>
  )
}
