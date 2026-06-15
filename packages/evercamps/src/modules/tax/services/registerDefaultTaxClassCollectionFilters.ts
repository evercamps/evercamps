import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';
import type { Filter } from '../types/index.js';

export async function registerDefaultTaxClassCollectionFilters() {
  const defaultFilters = [
    {
      key: 'name',
      operation: ['like'],
      callback: (query: any, operation: string, value: string, currentFilters: Filter[]) => {
        query.andWhere('tax_class.name', OPERATION_MAP[operation], `%${value}%`);
        currentFilters.push({ key: 'name', operation, value });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query: any, operation: string, value: string, currentFilters: Filter[]) => {
        const taxClassCollectionSortBy = (getValueSync as any)(
          'taxClassCollectionSortBy',
          { name: (q: any) => q.orderBy('tax_class.name') }
        ) as Record<string, (q: any, op: string) => void>;

        if (taxClassCollectionSortBy[value]) {
          taxClassCollectionSortBy[value](query, operation);
          currentFilters.push({ key: 'ob', operation, value });
        }
      }
    }
  ];

  return defaultFilters;
}
