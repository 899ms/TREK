import {
  collectionDeleteManyRequestSchema,
  collectionPlaceCurrencySchema,
  collectionPlaceUpdateRequestSchema,
  collectionReorderRequestSchema,
  collectionSavePlaceRequestSchema,
} from './collection.schema';

import { describe, expect, it } from 'vitest';

describe('collectionPlaceUpdateRequestSchema', () => {
  // Regression for #1437: an update that omits `status` must NOT inject a default
  // of 'idea', otherwise the server overwrites the stored status on every edit-save.
  it('does not inject a status when the field is absent', () => {
    const parsed = collectionPlaceUpdateRequestSchema.parse({ name: 'Trevi Fountain' });
    expect('status' in parsed).toBe(false);
    expect(parsed.status).toBeUndefined();
  });

  it('passes through an explicitly provided status', () => {
    expect(collectionPlaceUpdateRequestSchema.parse({ status: 'want' }).status).toBe('want');
    expect(collectionPlaceUpdateRequestSchema.parse({ status: 'visited' }).status).toBe('visited');
  });

  it('catches an invalid status back to idea rather than throwing', () => {
    expect(collectionPlaceUpdateRequestSchema.parse({ status: 'bogus' as never }).status).toBe('idea');
  });

  // #1870: the update contract knew no `address`, so the validation pipe stripped
  // it and the address of a saved place could never be corrected.
  it('passes an address through and accepts null to clear it', () => {
    expect(collectionPlaceUpdateRequestSchema.parse({ address: 'Via Nuova 1' }).address).toBe('Via Nuova 1');
    expect(collectionPlaceUpdateRequestSchema.parse({ address: null }).address).toBeNull();
  });

  it('leaves an absent address absent, so an unrelated edit keeps the stored one', () => {
    const parsed = collectionPlaceUpdateRequestSchema.parse({ name: 'Trevi Fountain' });
    expect('address' in parsed).toBe(false);
    expect(parsed.address).toBeUndefined();
  });

  // Save and update must cap the address the same way (neither does): a limit on
  // one side only would reject on edit what saving accepted.
  it('caps the address on neither the save nor the update side', () => {
    const long = 'x'.repeat(5000);
    expect(collectionPlaceUpdateRequestSchema.parse({ address: long }).address).toBe(long);
    expect(collectionSavePlaceRequestSchema.parse({ collection_id: 1, name: 'X', address: long }).address).toBe(long);
  });
});

// #2471: price, currency, website and phone were columns the update contract did
// not know, so the validation pipe stripped them and a saved place's cost could
// never be edited.
describe('collectionPlaceUpdateRequestSchema price, currency, website and phone', () => {
  it('passes all four through', () => {
    const parsed = collectionPlaceUpdateRequestSchema.parse({
      price: 12.5,
      currency: 'CHF',
      website: 'https://museum.example',
      phone: '+41 44 123 45 67',
    });
    expect(parsed).toEqual({
      price: 12.5,
      currency: 'CHF',
      website: 'https://museum.example',
      phone: '+41 44 123 45 67',
    });
  });

  it('accepts null on each to clear it, and zero as a price', () => {
    const none = { price: null, currency: null, website: null, phone: null };
    expect(collectionPlaceUpdateRequestSchema.parse(none)).toEqual(none);
    expect(collectionPlaceUpdateRequestSchema.parse({ price: 0 }).price).toBe(0);
  });

  it('leaves all four absent when an unrelated field changes', () => {
    const parsed = collectionPlaceUpdateRequestSchema.parse({ name: 'Kunsthaus' });
    for (const key of ['price', 'currency', 'website', 'phone']) expect(key in parsed).toBe(false);
  });

  it('refuses a negative or non-finite price', () => {
    for (const price of [-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(collectionPlaceUpdateRequestSchema.safeParse({ price }).success).toBe(false);
    }
  });

  it('normalises the currency to a trimmed upper-case code', () => {
    expect(collectionPlaceUpdateRequestSchema.parse({ currency: ' usd ' }).currency).toBe('USD');
    expect(collectionPlaceCurrencySchema.parse('jpy')).toBe('JPY');
  });

  it('refuses a currency that is not three letters', () => {
    for (const currency of ['EU', 'EURO', '€', '12A', '']) {
      expect(collectionPlaceUpdateRequestSchema.safeParse({ currency }).success).toBe(false);
    }
  });

  it('holds the website to http or https, like the save side', () => {
    expect(collectionPlaceUpdateRequestSchema.safeParse({ website: 'javascript:alert(1)' }).success).toBe(false);
    expect(collectionPlaceUpdateRequestSchema.safeParse({ website: 'http://museum.example' }).success).toBe(true);
  });

  it('trims the phone and caps it at 60 characters', () => {
    expect(collectionPlaceUpdateRequestSchema.parse({ phone: '  +49 30 1234  ' }).phone).toBe('+49 30 1234');
    expect(collectionPlaceUpdateRequestSchema.safeParse({ phone: '1'.repeat(60) }).success).toBe(true);
    expect(collectionPlaceUpdateRequestSchema.safeParse({ phone: '1'.repeat(61) }).success).toBe(false);
  });
});

// The two ratchet schemas replace hand-rolled "array of numbers" checks — they
// must stay exactly that permissive (empty arrays included, no int/positive).
describe('collectionReorderRequestSchema / collectionDeleteManyRequestSchema', () => {
  it('accepts any array of numbers, empty included', () => {
    expect(collectionReorderRequestSchema.parse({ orderedIds: [] }).orderedIds).toEqual([]);
    expect(collectionReorderRequestSchema.parse({ orderedIds: [3, 1, 2] }).orderedIds).toEqual([3, 1, 2]);
    expect(collectionDeleteManyRequestSchema.parse({ ids: [] }).ids).toEqual([]);
    expect(collectionDeleteManyRequestSchema.parse({ ids: [7] }).ids).toEqual([7]);
  });

  it('rejects non-arrays and non-numeric members', () => {
    expect(() => collectionReorderRequestSchema.parse({ orderedIds: 'nope' })).toThrow();
    expect(() => collectionReorderRequestSchema.parse({})).toThrow();
    expect(() => collectionDeleteManyRequestSchema.parse({ ids: ['a'] })).toThrow();
  });
});
