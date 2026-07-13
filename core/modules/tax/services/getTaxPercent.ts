import type { TaxRateRow } from '../types/index.js';

export function getTaxPercent(rates: TaxRateRow[]): number {
  let taxPercent = 0;

  rates.forEach((rate) => {
    const taxRate = rate.rate / 100;
    if (rate.is_compound === true) {
      taxPercent = taxPercent + taxRate + taxPercent * taxRate;
    } else {
      taxPercent += taxRate;
    }
  });

  return taxPercent * 100;
}
