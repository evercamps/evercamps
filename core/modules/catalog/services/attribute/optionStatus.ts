// Active/inactive flag of an attribute option (attribute_option.status,
// catalog/migration/Version-1.1.4.ts). The admin form posts it as "1"/"0";
// API callers may send a boolean.

export type OptionStatusInput = {
  status?: string | number | boolean | null;
};

/**
 * Returns `{ status }` to merge into an insert/update, or `{}` when the input
 * has no status (an update then keeps the stored value, an insert gets the
 * column default: active).
 */
export function normalizeOptionStatus(option: OptionStatusInput): { status?: boolean } {
  const value = option.status;
  if (value === undefined || value === null || value === '') {
    return {};
  }
  if (typeof value === 'boolean') {
    return { status: value };
  }
  const text = String(value).trim().toLowerCase();
  return { status: !(text === '0' || text === 'false') };
}
