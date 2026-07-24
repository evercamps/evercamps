import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

interface CurrentFilter {
  key: string;
  operation: string;
  value: unknown;
}

interface QueryBuilder {
  andWhere: (
    column: string,
    operation: string,
    value: unknown
  ) => QueryBuilder;
  orderBy: (column: string, direction?: string) => QueryBuilder;
}

interface Filter {
  key: string;
  operation: string[];
  callback: (
    query: QueryBuilder,
    operation: string,
    value: unknown,
    currentFilters: CurrentFilter[]
  ) => void;
}

export async function registerDefaultCustomerGroupCollectionFilters(): Promise<
  Filter[]
> {
  const defaultFilters: Filter[] = [
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'customer_group.group_name',
          OPERATION_MAP[operation],
          `%${value}%`
        );

        currentFilters.push({
          key: 'name',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const customerGroupCollectionSortBy = getValueSync(
          'customerGroupCollectionSortBy',
          {
            name: (query: QueryBuilder) =>
              query.orderBy('customer_group.group_name')
          }
        ) as Record<string, (query: QueryBuilder) => QueryBuilder>;

        if (customerGroupCollectionSortBy[value as string]) {
          customerGroupCollectionSortBy[value as string](query);

          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        }
      }
    }
  ];

  return defaultFilters;
}