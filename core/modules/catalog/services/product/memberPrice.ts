// Member price of a product (#209, GLOSSARY "Member price"). The product form
// posts an empty string for "no member price"; the database wants NULL.

/**
 * Turns an empty `member_price` in product data into null. Leaves the data
 * alone when the field is absent, so a partial update doesn't clear it.
 */
export function normalizeProductMemberPrice<T extends Record<string, any>>(data: T): T {
  if (!('member_price' in data)) {
    return data;
  }
  const value = data.member_price;
  if (value === undefined || value === null || String(value).trim() === '') {
    return { ...data, member_price: null };
  }
  return data;
}
