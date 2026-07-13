import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { GraphQLFilter, GraphQLFilterOperation } from '../../../types/graphqlFilter.js';

export async function registerDefaultTaxClassCollectionFilters() {
  const defaultFilters = [
    {
      key: 'name',
      operation: ['like'],
      callback: (query: any, operation: GraphQLFilterOperation, value: string, currentFilters: GraphQLFilter[]) => {
        query.andWhere('tax_class.name', OPERATION_MAP[operation], `%${value}%`);
        currentFilters.push({ key: 'name', operation, value });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query: any, operation: GraphQLFilterOperation, value: string, currentFilters: GraphQLFilter[]) => {
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
