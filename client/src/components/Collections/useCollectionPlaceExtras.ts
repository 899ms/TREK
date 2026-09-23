import { useCallback, useState } from 'react'
import type { CollectionPlace, CollectionPlaceUpdateRequest } from '@trek/shared'
import { useTranslation } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'
import { amountToInputString, formatMoney, localizeAmountInput } from '../../utils/formatters'
import { safeHttpUrl } from '../../utils/safeUrl'
import { normalizeLinkUrl } from '../../pages/collections/collectionsModel'
import { SYMBOLS, currenciesWith } from '../Budget/BudgetPanel.constants'

/**
 * Price, website and phone of a saved place (#2471).
 *
 * The columns always existed and travelled along on save and on copy into a
 * trip, but neither editor showed them. Desktop (CollectionPlaceDetail) and
 * phone (MCollPlaceSheet) both edit them through this one hook, so the two
 * shells only differ in markup.
 */

type ExtrasSource = Pick<CollectionPlace, 'price' | 'currency' | 'website' | 'phone'>

export type CollectionPlaceExtrasPatch = Pick<CollectionPlaceUpdateRequest, 'price' | 'currency' | 'website' | 'phone'>

/** Form state: the price is a dot-normalized input string, like every amount field. */
export interface CollectionPlaceExtrasDraft {
  price: string
  currency: string
  website: string
  phone: string
}

export function extrasDraftFrom(place: ExtrasSource | null | undefined, fallbackCurrency: string): CollectionPlaceExtrasDraft {
  const currency = (place?.currency || fallbackCurrency || 'EUR').toUpperCase()
  return {
    price: place?.price != null ? amountToInputString(place.price, currency) : '',
    currency,
    website: place?.website ?? '',
    phone: place?.phone ?? '',
  }
}

/** The typed price: null for an empty field, NaN for one that is not a plain amount. */
export function parsePriceInput(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN
}

/**
 * Only what the user changed. The update contract holds these fields to a
 * stricter standard than older rows were written with, so resending an
 * untouched value could refuse an unrelated edit, and a stored price would get
 * a currency pinned on it that nobody picked.
 */
export function extrasPatch(initial: CollectionPlaceExtrasDraft, draft: CollectionPlaceExtrasDraft): CollectionPlaceExtrasPatch {
  const patch: CollectionPlaceExtrasPatch = {}
  const price = parsePriceInput(draft.price)
  const priceChanged = draft.price.trim() !== initial.price.trim()
  if (priceChanged || (price != null && draft.currency !== initial.currency)) {
    patch.price = price
    // A list has no base currency to read a bare number in, so a price always
    // goes out with the currency it was typed in.
    if (price != null) patch.currency = draft.currency
  }
  const website = draft.website.trim()
  if (website !== initial.website.trim()) patch.website = website ? normalizeLinkUrl(website) : null
  const phone = draft.phone.trim()
  if (phone !== initial.phone.trim()) patch.phone = phone || null
  return patch
}

/** A tel: link keeps the digits and a leading plus, nothing a dialer would choke on. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function useCollectionPlaceExtras(place: ExtrasSource | null | undefined) {
  const { locale } = useTranslation()
  const defaultCurrency = useSettingsStore(s => s.settings.default_currency)
  const [initial, setInitial] = useState(() => extrasDraftFrom(place, defaultCurrency))
  const [draft, setDraft] = useState(initial)

  /** Seed the form from the place as it is now; call it when editing starts. */
  const reset = useCallback((from: ExtrasSource | null | undefined) => {
    const seeded = extrasDraftFrom(from, defaultCurrency)
    setInitial(seeded)
    setDraft(seeded)
  }, [defaultCurrency])

  const set = useCallback(<K extends keyof CollectionPlaceExtrasDraft>(key: K, value: CollectionPlaceExtrasDraft[K]) => {
    setDraft(d => ({ ...d, [key]: value }))
  }, [])

  const price = place?.price ?? 0
  const phone = place?.phone?.trim() || null
  const priceValid = !Number.isNaN(parsePriceInput(draft.price))
  return {
    draft,
    set,
    reset,
    priceValid,
    patch: () => extrasPatch(initial, draft),
    // Spread onto the shells' NumericInput and CustomSelect. The amount shows with
    // the currency's own decimal separator and is kept dot-normalized, the way the
    // costs form does it.
    priceInput: {
      mode: 'decimal' as const,
      value: localizeAmountInput(draft.price, draft.currency),
      onValueChange: (v: string) => set('price', v.replace(',', '.')),
      'aria-invalid': !priceValid,
    },
    currencySelect: {
      value: draft.currency,
      onChange: (v: string | number) => set('currency', String(v)),
      options: currenciesWith(draft.currency).map(c => ({ value: c, label: SYMBOLS[c] ? `${c}  ${SYMBOLS[c]}` : c })),
    },
    // Read mode: a free place shows no price, the same rule the trip inspector follows.
    priceLabel: price > 0 ? formatMoney(price, place?.currency || defaultCurrency || 'EUR', locale) : null,
    websiteHref: safeHttpUrl(place?.website),
    phone,
    phoneHref: phone ? phoneHref(phone) : null,
  }
}
