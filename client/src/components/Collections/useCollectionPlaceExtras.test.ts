// FE-COMP-COLEXTRAS-001 to FE-COMP-COLEXTRAS-012: price, website and phone of a saved place (#2471).
import { act, renderHook } from '@testing-library/react'
import { useSettingsStore } from '../../store/settingsStore'
import { resetAllStores } from '../../../tests/helpers/store'
import { formatMoney } from '../../utils/formatters'
import {
  extrasDraftFrom,
  extrasPatch,
  parsePriceInput,
  phoneHref,
  useCollectionPlaceExtras,
  type CollectionPlaceExtrasDraft,
} from './useCollectionPlaceExtras'

vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (k: string) => k, locale: 'en-US' }) }))

const blank: CollectionPlaceExtrasDraft = { price: '', currency: 'EUR', website: '', phone: '' }

function withDefaultCurrency(code: string) {
  useSettingsStore.setState(s => ({ settings: { ...s.settings, default_currency: code } }))
}

beforeEach(() => {
  resetAllStores()
})

describe('extrasDraftFrom', () => {
  it('FE-COMP-COLEXTRAS-001: seeds the price padded to its currency, and keeps website and phone', () => {
    expect(extrasDraftFrom({ price: 4.9, currency: 'eur', website: 'https://a.example', phone: '+49 30' }, 'USD')).toEqual({
      price: '4.90', currency: 'EUR', website: 'https://a.example', phone: '+49 30',
    })
    expect(extrasDraftFrom({ price: 1500, currency: 'JPY' }, 'EUR').price).toBe('1500')
  })

  it('FE-COMP-COLEXTRAS-002: without a price or a currency it falls back to the user default, then EUR', () => {
    expect(extrasDraftFrom({ price: null, currency: null }, 'chf')).toEqual({ price: '', currency: 'CHF', website: '', phone: '' })
    expect(extrasDraftFrom(null, '')).toEqual(blank)
  })
})

describe('parsePriceInput', () => {
  it('FE-COMP-COLEXTRAS-003: reads an empty field as no price and a comma as the decimal separator', () => {
    expect(parsePriceInput('  ')).toBeNull()
    expect(parsePriceInput('12,5')).toBe(12.5)
    expect(parsePriceInput('0')).toBe(0)
    expect(parsePriceInput('.5')).toBe(0.5)
  })

  it('FE-COMP-COLEXTRAS-004: anything that is not one plain amount is NaN', () => {
    for (const raw of ['1.2.3', '1,000.50', '-3', 'abc']) expect(parsePriceInput(raw)).toBeNaN()
  })
})

describe('extrasPatch', () => {
  it('FE-COMP-COLEXTRAS-005: an untouched form sends nothing, whatever the stored values look like', () => {
    const initial = extrasDraftFrom({ price: 10, currency: null, website: 'www.legacy.example', phone: '1'.repeat(80) }, 'EUR')
    expect(extrasPatch(initial, { ...initial })).toEqual({})
  })

  it('FE-COMP-COLEXTRAS-006: a new price goes out with its currency', () => {
    expect(extrasPatch(blank, { ...blank, price: '12.5', currency: 'CHF' })).toEqual({ price: 12.5, currency: 'CHF' })
  })

  it('FE-COMP-COLEXTRAS-007: changing only the currency of a price resends both', () => {
    const initial = { ...blank, price: '12.00' }
    expect(extrasPatch(initial, { ...initial, currency: 'USD' })).toEqual({ price: 12, currency: 'USD' })
  })

  it('FE-COMP-COLEXTRAS-008: clearing the price sends null and leaves the currency alone; a currency without a price sends nothing', () => {
    const initial = { ...blank, price: '12.00' }
    expect(extrasPatch(initial, { ...initial, price: '' })).toEqual({ price: null })
    expect(extrasPatch(blank, { ...blank, currency: 'USD' })).toEqual({})
  })

  it('FE-COMP-COLEXTRAS-009: website gets https:// like a link does, phone is trimmed, and emptied fields clear', () => {
    expect(extrasPatch(blank, { ...blank, website: ' museum.example ', phone: ' +41 44 ' })).toEqual({
      website: 'https://museum.example', phone: '+41 44',
    })
    const initial = { ...blank, website: 'https://museum.example', phone: '+41 44' }
    expect(extrasPatch(initial, { ...initial, website: '  ', phone: '' })).toEqual({ website: null, phone: null })
  })
})

describe('phoneHref', () => {
  it('FE-COMP-COLEXTRAS-010: keeps the digits and a leading plus', () => {
    expect(phoneHref('+41 (44) 253-84 84')).toBe('tel:+41442538484')
  })
})

describe('useCollectionPlaceExtras', () => {
  it('FE-COMP-COLEXTRAS-011: formats the stored price for read mode, only above zero, and guards the website', () => {
    withDefaultCurrency('CHF')
    const paid = renderHook(() => useCollectionPlaceExtras({ price: 24.5, currency: 'EUR', website: 'https://kunsthaus.example', phone: ' +41 44 ' }))
    expect(paid.result.current.priceLabel).toBe(formatMoney(24.5, 'EUR', 'en-US'))
    expect(paid.result.current.websiteHref).toBe('https://kunsthaus.example')
    expect(paid.result.current.phone).toBe('+41 44')
    expect(paid.result.current.phoneHref).toBe('tel:+4144')

    // No currency stored: the user's own default names it.
    const bare = renderHook(() => useCollectionPlaceExtras({ price: 8, currency: null }))
    expect(bare.result.current.priceLabel).toBe(formatMoney(8, 'CHF', 'en-US'))

    const free = renderHook(() => useCollectionPlaceExtras({ price: 0, currency: 'EUR', website: 'javascript:alert(1)', phone: '  ' }))
    expect(free.result.current.priceLabel).toBeNull()
    expect(free.result.current.websiteHref).toBeNull()
    expect(free.result.current.phone).toBeNull()
    expect(free.result.current.phoneHref).toBeNull()
  })

  it('FE-COMP-COLEXTRAS-012: reset seeds from the place, set edits the draft, and an unparseable price blocks the patch', () => {
    withDefaultCurrency('USD')
    const { result } = renderHook(() => useCollectionPlaceExtras(null))
    act(() => result.current.reset({ price: 12, currency: 'EUR', website: null, phone: null }))
    expect(result.current.draft).toEqual({ price: '12.00', currency: 'EUR', website: '', phone: '' })
    expect(result.current.patch()).toEqual({})
    expect(result.current.currencySelect.options).toContainEqual({ value: 'EUR', label: 'EUR  €' })
    // EUR shows its decimal comma in the field; the draft stays dot-normalized.
    expect(result.current.priceInput.value).toBe('12,00')

    act(() => result.current.priceInput.onValueChange('1.2.3'))
    expect(result.current.priceValid).toBe(false)
    expect(result.current.priceInput['aria-invalid']).toBe(true)

    act(() => result.current.priceInput.onValueChange('15,5'))
    act(() => result.current.currencySelect.onChange('GBP'))
    expect(result.current.draft.price).toBe('15.5')
    expect(result.current.priceValid).toBe(true)
    expect(result.current.patch()).toEqual({ price: 15.5, currency: 'GBP' })

    // A place without a currency seeds the user's default into the picker.
    act(() => result.current.reset({ price: null, currency: null }))
    expect(result.current.draft.currency).toBe('USD')
  })
})
