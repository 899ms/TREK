/**
 * What the manual-add dialog and the planner agree on.
 *
 * Their own module rather than the dialog's, so the planner hook can take the shapes
 * without importing a component: the file stays free of React and of the api client, the
 * way `roadtripModel` and `corridor` do.
 */

/** Where a stop added by hand goes: a card of the rail, and the position in its chain. */
export interface ManualStopTarget {
  dayId: number
  /** Counted along the card's stops, the same index space a corridor hit is placed at. */
  position: number
  /** How far the place sits from the road being driven; zero when nothing has routed. */
  offRouteKm: number
}

/** A place chosen by hand, in the shape the stop popup and the place write want. */
export interface ManualStopPlace {
  name: string
  lat: number
  lng: number
  address: string | null
  website: string | null
  phone: string | null
  /** Empty for a provider with no id of its own, which is what the rest of TREK does. */
  osm_id: string
  /** The kind the popup starts on, when the provider named one. */
  category: string | null
}
