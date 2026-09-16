import { Info } from 'lucide-react'
import { MAP_CONTROL_SHADOW } from './mapControlShadow'
import { useTranslation } from '../../i18n'

interface MapAttributionToggleProps {
  open: boolean
  onToggle: () => void
  /** Same band as the locate button, so the two sit on one line. */
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
        bottom: bottomOffset,
        // Clear of the locate button at right: 12 plus its 42, with a gap.
        right: 62,
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
