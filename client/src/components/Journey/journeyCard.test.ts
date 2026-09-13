// FE-JRN-CARDMODEL-001 to FE-JRN-CARDMODEL-010

import { describe, it, expect } from 'vitest'
import { cardDateLabel, cardPhotoId, cardPlace, cardTitle, countryFlag, dayColorOf, journeyDays } from './journeyCard'
import { DAY_COLORS } from './dayColors'

const t = (key: string) => key

describe('countryFlag', () => {
  it('FE-JRN-CARDMODEL-001: turns an ISO code into the flag', () => {
    expect(countryFlag('DE')).toBe('🇩🇪')
    expect(countryFlag('jp')).toBe('🇯🇵')
  })

  it('FE-JRN-CARDMODEL-002: draws nothing rather than two stray letters', () => {
    // Everything that is not a plain alpha-2 pair, plus Kosovo, which has no flag
    // on any platform and would render as the letters XK in a corner.
    expect(countryFlag(null)).toBe('')
    expect(countryFlag(undefined)).toBe('')
    expect(countryFlag('')).toBe('')
    expect(countryFlag('DEU')).toBe('')
    expect(countryFlag('D1')).toBe('')
    expect(countryFlag('XK')).toBe('')
  })
})

describe('cardTitle', () => {
  it('FE-JRN-CARDMODEL-003: uses the title when there is one', () => {
    expect(cardTitle({ title: 'Mercado', type: 'entry', location_name: 'Lisbon' }, t)).toBe('Mercado')
  })

  it('FE-JRN-CARDMODEL-004: says what a suggestion is rather than calling it untitled', () => {
    expect(cardTitle({ title: null, type: 'skeleton', location_name: 'Museum' }, t)).toBe('journey.entry.suggestion')
  })

  it('FE-JRN-CARDMODEL-005: falls back to the place before it falls back to a placeholder', () => {
    // Where you were is at least true; "Untitled" says nothing at all.
    expect(cardTitle({ title: '   ', type: 'entry', location_name: 'Porto, Portugal' }, t)).toBe('Porto, Portugal')
    expect(cardTitle({ title: null, type: 'entry', location_name: null }, t)).toBe('journey.editor.titlePlaceholder')
    expect(cardTitle({ title: null, type: 'checkin', location_name: null }, t)).toBe('journey.detail.journeyTab')
  })
})

describe('cardPlace', () => {
  it('FE-JRN-CARDMODEL-006: is left out when the title is already the place', () => {
    // cardTitle promoted the place to the title, so repeating it below would be
    // the same words twice on a card that has room for two lines.
    expect(cardPlace({ title: null, location_name: 'Porto, Portugal' })).toBe('')
    expect(cardPlace({ title: 'Mercado', location_name: 'Porto, Portugal' })).toBe('Porto, Portugal')
    expect(cardPlace({ title: 'Mercado', location_name: null })).toBe('')
  })
})

describe('cardPhotoId', () => {
  it('FE-JRN-CARDMODEL-007: reads either shape a shell hands over', () => {
    expect(cardPhotoId({ photo_id: 4, id: 9 })).toBe(4)
    expect(cardPhotoId({ id: 9 })).toBe(9)
    expect(cardPhotoId(undefined)).toBeUndefined()
  })
})

describe('cardDateLabel', () => {
  it('FE-JRN-CARDMODEL-008: is short, and in the reader locale', () => {
    expect(cardDateLabel('2026-03-15', 'en-GB')).toBe('15 Mar')
  })
})

describe('journeyDays', () => {
  it('FE-JRN-CARDMODEL-009: one entry per day, in order, coloured by position', () => {
    const days = journeyDays([
      { entry_date: '2026-03-16' },
      { entry_date: '2026-03-15' },
      { entry_date: '2026-03-16' },
    ])

    expect(days).toEqual([
      { date: '2026-03-15', color: DAY_COLORS[0] },
      { date: '2026-03-16', color: DAY_COLORS[1] },
    ])
  })

  it('FE-JRN-CARDMODEL-010: a date nobody knows still gets a colour', () => {
    const days = journeyDays([{ entry_date: '2026-03-15' }])
    expect(dayColorOf(days, '2026-03-15')).toBe(DAY_COLORS[0])
    expect(dayColorOf(days, '2099-01-01')).toBe(DAY_COLORS[0])
  })
})
