// FE-COMP-DAYIMPACT-001 to FE-COMP-DAYIMPACT-003
import { describe, it, expect } from 'vitest'
import { BedDouble, MapPin } from 'lucide-react'
import { render, screen } from '../../../tests/helpers/render'
import DayImpactList from './DayImpactList'
import MDayImpactList from '../../mobile/components/MDayImpactList'
import type { ImpactLine } from '../../utils/dayImpactLines'

const lines: ImpactLine[] = [
  { key: 'stay-9', icon: BedDouble, tone: 'danger', text: 'Stay at Harbour Hotel', hint: 'Cancelled with its booking.' },
  { key: 'places', icon: MapPin, tone: 'neutral', text: 'Planned places: 3' },
]

describe('DayImpactList', () => {
  it('FE-COMP-DAYIMPACT-001: one row per line, text and hint, named for assistive tech', () => {
    render(<DayImpactList lines={lines} label="Delete Tue, Oct 13?" />)
    const list = screen.getByRole('list', { name: 'Delete Tue, Oct 13?' })
    const rows = screen.getAllByRole('listitem')
    expect(list).toContainElement(rows[0])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Stay at Harbour Hotel')
    expect(rows[0]).toHaveTextContent('Cancelled with its booking.')
    expect(rows[1]).toHaveTextContent('Planned places: 3')
  })

  it('FE-COMP-DAYIMPACT-002: the tone reaches the row: money in the danger tokens, the rest in the content tokens', () => {
    render(<DayImpactList lines={lines} />)
    const [stay, places] = screen.getAllByRole('listitem')
    expect(stay).toHaveAttribute('data-tone', 'danger')
    expect(screen.getByText('Stay at Harbour Hotel')).toHaveClass('text-danger')
    expect(stay.querySelector('span')).toHaveClass('bg-danger-soft')
    expect(screen.getByText('Planned places: 3')).toHaveClass('text-content')
    expect(places.querySelectorAll('p')).toHaveLength(1)
  })

  it('FE-COMP-DAYIMPACT-003: renders nothing without lines, and the phone skin draws the same rows in its own tokens', () => {
    const { container } = render(<DayImpactList lines={[]} />)
    expect(container).toBeEmptyDOMElement()

    render(<MDayImpactList lines={lines} label="phone" />)
    const phone = screen.getByRole('list', { name: 'phone' })
    expect(phone.className).toContain('var(--m-inner)')
    const rows = phone.querySelectorAll('li')
    expect(rows).toHaveLength(2)
    // Hairlines between rows, not above the first.
    expect(rows[0].className).not.toContain('border-t')
    expect(rows[1].className).toContain('border-t')
  })
})
