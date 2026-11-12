import type { AxiosInstance } from 'axios';
import { debug, pool } from '../core.js';
import type { WooCommerceMeta, WooCommerceOrder, WooCommerceSettings } from '../types.js';
import { fetchCustomer } from './woocommerceClient.js';

// The customer's national number is a custom field (meta_data) on the
// WooCommerce customer (and sometimes on the order). The order import copies
// it to customer.national_number (column added by the belgian-administration
// plugin) when the local customer has none yet - a number entered in
// EverCamps itself (account page / checkout) is never overwritten.

const AUTO_KEY = /rijksregister|national/i;

// Belgian national number: 11 digits, checksum 97 - (first 9 digits mod 97),
// with 2000000000 added first for people born from 2000.
export function isValidNationalNumber(raw: unknown): boolean {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length !== 11) {
    return false;
  }
  const base = parseInt(digits.slice(0, 9), 10);
  const check = parseInt(digits.slice(9), 10);
  const expected = (n: number) => (n % 97 === 0 ? 97 : 97 - (n % 97));
  return check === expected(base) || check === expected(2000000000 + base);
}

export function findNationalNumber(meta: WooCommerceMeta[] | undefined, key: string): string | null {
  for (const entry of meta ?? []) {
    const matches = key ? entry.key === key : AUTO_KEY.test(entry.key);
    if (!matches || entry.value === null || entry.value === undefined) {
      continue;
    }
    const digits = String(entry.value).replace(/\D/g, '');
    if (isValidNationalNumber(digits)) {
      return digits;
    }
  }
  return null;
}

let hasColumn: boolean | undefined;
async function customerHasNationalNumberColumn(): Promise<boolean> {
  if (hasColumn === undefined) {
    const result = await (pool as any).query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'customer' AND column_name = 'national_number'`
    );
    hasColumn = result.rows.length > 0;
  }
  return hasColumn;
}

/**
 * Creates an importer for one run: WC customers are fetched once each.
 */
export function createCustomerNationalNumberImporter(client: AxiosInstance, settings: WooCommerceSettings) {
  const cache = new Map<number, WooCommerceMeta[]>();

  return async function importCustomerNationalNumber(
    wcOrder: WooCommerceOrder,
    customerId: number | null
  ): Promise<void> {
    if (!customerId || !(await customerHasNationalNumberColumn())) {
      return;
    }
    const key = settings.customerNationalNumberMetaKey;
    let value = findNationalNumber(wcOrder.meta_data, key);
    if (!value && wcOrder.customer_id > 0) {
      if (!cache.has(wcOrder.customer_id)) {
        const wcCustomer = await fetchCustomer(client, wcOrder.customer_id);
        cache.set(wcOrder.customer_id, wcCustomer?.meta_data ?? []);
      }
      value = findNationalNumber(cache.get(wcOrder.customer_id), key);
    }
    if (!value) {
      return;
    }
    const result = await (pool as any).query(
      `UPDATE customer SET national_number = $1
       WHERE customer_id = $2 AND (national_number IS NULL OR national_number = '')`,
      [value, customerId]
    );
    if (result.rowCount > 0) {
      debug(`Customer ${customerId}: national number imported from WooCommerce.`);
    }
  };
}
