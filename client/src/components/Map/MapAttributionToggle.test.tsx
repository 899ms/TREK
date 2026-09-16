// FE-MAP-ATTRIB-001 to FE-MAP-ATTRIB-003
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapAttributionToggle from './MapAttributionToggle'

// Outside a TranslationProvider t(key) echoes the key, so the label is asserted as its key.
const BAND = 'calc(var(--bottom-nav-h, 84px) + 12px)'

describe('MapAttributionToggle', () => {
  it('FE-MAP-ATTRIB-001: it follows a credit corner where the map has one, and keeps the locate band where it has not', () => {
    const { getByRole } = render(<MapAttributionToggle open={false} onToggle={() => {}} bottomOffset={BAND} />)
    const style = getByRole('button').style

    // Both numbers come from the map around it first. A map without a credit corner
    // defines neither variable, so the fallbacks are the old slot beside the locate button.
    expect(style.right).toBe('var(--m-credit-right, 62px)')
    expect(style.bottom).toBe(`var(--m-credit-bottom, ${BAND})`)
  })

  it('FE-MAP-ATTRIB-002: it is labelled, says whether the credit is open, and toggles once per tap', () => {
    const onToggle = vi.fn()
    const { getByRole, rerender } = render(<MapAttributionToggle open={false} onToggle={onToggle} bottomOffset={BAND} />)
    const button = getByRole('button')

    expect(button.getAttribute('title')).toBe('map.attribution')
    expect(button.getAttribute('aria-label')).toBe('map.attribution')
    expect(button.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)

    rerender(<MapAttributionToggle open onToggle={onToggle} bottomOffset={BAND} />)
    expect(getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('FE-MAP-ATTRIB-003: wherever it sits, it stays above the Leaflet control corners', () => {
    const { getByRole } = render(<MapAttributionToggle open={false} onToggle={() => {}} bottomOffset={BAND} />)
    const style = getByRole('button').style

    // index.css pins `.leaflet-bottom` to z-index 1, and the open credit lives in that
    // corner. The (i) sits in the same row now, so it has to stay the one on top.
    expect(style.position).toBe('absolute')
    expect(style.zIndex).toBe('1000')
  })
})
