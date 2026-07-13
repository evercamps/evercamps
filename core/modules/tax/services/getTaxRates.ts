import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import type { TaxRateRow } from '../types/index.js';

export async function getTaxRates(
  taxClassId: number,
  country: string | null,
  province: string | null,
  postcode: string | null = null
): Promise<TaxRateRow[]> {
  if (!country) {
    return [];
  }

  const taxRatesQuery = select().from('tax_rate');
  taxRatesQuery.where('tax_class_id', '=', taxClassId);
  taxRatesQuery.orderBy('priority', 'ASC');
  let taxRates: any[] = await taxRatesQuery.execute(pool);

  if (!taxRates) {
    return [];
  }

  taxRates.forEach((taxRate) => {
    taxRate.country = taxRate.country
      ? taxRate.country.split(',').filter((item: string) => item.trim() !== '')
      : [];
    taxRate.province = taxRate.province
      ? taxRate.province.split(',').filter((item: string) => item.trim() !== '')
      : [];
    taxRate.postcode = taxRate.postcode
      ? taxRate.postcode.split(',').filter((item: string) => item.trim() !== '')
      : [];

    if (taxRate.country.length === 0) taxRate.country.push('*');
    if (taxRate.province.length === 0) taxRate.province.push('*');
    if (taxRate.postcode.length === 0) taxRate.postcode.push('*');
  });

  taxRates = taxRates.filter((taxRate) => {
    return (
      (taxRate.country.includes(country) || taxRate.country.includes('*')) &&
      (taxRate.province.includes(province) || taxRate.province.includes('*') || province === null) &&
      (taxRate.postcode.includes(postcode) || taxRate.postcode.includes('*') || postcode === null)
    );
  });

  return taxRates;
}
