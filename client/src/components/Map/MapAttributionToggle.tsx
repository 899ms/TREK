import { Info } from 'lucide-react'
import { MAP_CONTROL_SHADOW } from './mapControlShadow'
import { useTranslation } from '../../i18n'

interface MapAttributionToggleProps {
  open: boolean
  onToggle: () => void
  /**
   * Where the (i) sits on a map that defines no credit corner: the locate button's band,
   * so the two share a line.
   */
  bottomOffset: string
}

/**
 * The little (i) that stands in for the credit on a phone.
 *
 * Both GL engines ship one of these: below 640px they collapse their attribution to a
 * button and open it on a tap. Leaflet has no such mode, so on a screen the map fills,
 * its credit is a white two-line block parked in the middle of the picture. This is the
 * missing half of that pattern, and it is a React button rather than surgery on
 * Leaflet's own container because Leaflet rewrites that container's markup from scratch
 * whenever a layer with an attribution is added or removed.
 *
 * Nothing is hidden that cannot be read: one tap shows the full credit, every link in
 * it included, which is the same bargain the GL engines strike.
 */
export default function MapAttributionToggle({ open, onToggle, bottomOffset }: MapAttributionToggleProps) {
  const { t } = useTranslation()
  const label = t('map.attribution')
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded={open}
      style={{
        position: 'absolute',
        // A map that gives the credit a corner of its own (the phone trip map, see
        // `m-credit-corner` in mobile.css) places the (i) through these two variables, the
        // same two its GL engines are placed by. Every other map defines neither, so the
        // fallbacks keep the button where it always was: in the locate button's band,
        // clear of that button at right: 12 plus its 42, with a gap.
        bottom: `var(--m-credit-bottom, ${bottomOffset})`,
        right: 'var(--m-credit-right, 62px)',
        zIndex: 1000,
        width: 30,
        height: 30,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: 'var(--bg-card, white)',
        color: 'var(--text-muted, #6b7280)',
        boxShadow: MAP_CONTROL_SHADOW,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Info size={15} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}
