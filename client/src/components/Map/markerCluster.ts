import L from 'leaflet'

/**
 * The cluster group every place map is drawn with.
 *
 * The planner and the public share page draw the same trip, so they have to
 * cluster it the same way: a shared link that opens on three dozen overlapping
 * pins while the planner shows four tidy bubbles is one trip told two different
 * ways. Both maps build their group from this block and this factory (#2343).
 */
export const CLUSTER_OPTIONS = {
  chunkedLoading: true,
  chunkInterval: 30,
  chunkDelay: 0,
  // Pixels at the current zoom, so ordinary stops still come apart by zooming in.
  maxClusterRadius: 20,
  disableClusteringAtZoom: 9,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  animate: false,
}

/** The part of a Leaflet cluster this factory reads. */
export interface ClusterLike {
  getChildCount: () => number
}

/**
 * A count bubble, sized by what it stands for.
 *
 * Markup rather than a component because Leaflet owns this element:
 * `L.divIcon`'s html lands in the marker pane, outside React's tree — which is
 * also why its styling lives in index.css (`.marker-cluster-custom`).
 */
export function createClusterIcon(cluster: ClusterLike) {
  const count = cluster.getChildCount()
  const size = count < 10 ? 36 : count < 50 ? 42 : 48
  return L.divIcon({
    html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px;"><span>${count}</span></div>`,
    className: 'marker-cluster-wrapper',
    iconSize: L.point(size, size),
  })
}
