import { describe, expect, it } from '@jest/globals';
import { getAjv } from '../../../base/services/getAjv.js';
import { normalizeProductMemberPrice } from '../../services/product/memberPrice.js';
import productDataSchema from '../../services/product/productDataSchema.json' with { type: 'json' };

// Member price on the product (#209): optional, empty = none.

function validate(data: Record<string, unknown>): boolean {
  const ajv = getAjv();
  return ajv.compile({ ...productDataSchema, required: [] })(data) as boolean;
}

describe('product member price in product data', () => {
  it('accepts empty, null or a price with at most 2 decimals', () => {
    expect(validate({ member_price: '' })).toBe(true);
    expect(validate({ member_price: null })).toBe(true);
    expect(validate({ member_price: '210' })).toBe(true);
    expect(validate({ member_price: '210.50' })).toBe(true);
    expect(validate({ member_price: 210 })).toBe(true);
    expect(validate({})).toBe(true);
  });

  it('rejects negative or malformed prices', () => {
    expect(validate({ member_price: '-1' })).toBe(false);
    expect(validate({ member_price: -1 })).toBe(false);
    expect(validate({ member_price: '210.505' })).toBe(false);
    expect(validate({ member_price: 'abc' })).toBe(false);
  });

  it('does not add a member price to data without one', () => {
    const data: Record<string, unknown> = { name: 'Camp' };
    validate(data);
    expect('member_price' in data).toBe(false);
  });
});

describe('normalizeProductMemberPrice', () => {
  it('turns an empty member price into null', () => {
    expect(normalizeProductMemberPrice({ member_price: '' }).member_price).toBeNull();
    expect(normalizeProductMemberPrice({ member_price: '  ' }).member_price).toBeNull();
    expect(normalizeProductMemberPrice({ member_price: null }).member_price).toBeNull();
  });

  it('keeps a given member price', () => {
    expect(normalizeProductMemberPrice({ member_price: '210' }).member_price).toBe('210');
    expect(normalizeProductMemberPrice({ member_price: 0 }).member_price).toBe(0);
  });

  it('leaves data without a member price alone, so a partial update keeps it', () => {
    expect(normalizeProductMemberPrice({ name: 'Camp' })).toEqual({ name: 'Camp' });
  });
});
