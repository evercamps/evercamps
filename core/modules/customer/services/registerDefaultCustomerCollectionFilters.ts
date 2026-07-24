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
  or: (column: string, operation: string, value: unknown) => QueryBuilder;
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

export async function registerDefaultCustomerCollectionFilters(): Promise<
  Filter[]
> {
  const defaultFilters: Filter[] = [
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query
          .andWhere('customer.full_name', 'ILIKE', `%${value}%`)
          .or('customer.email', 'ILIKE', `%${value}%`);

        currentFilters.push({
          key: 'keyword',
          operation,
          value
        });
      }
    },
    {
      key: 'full_name',
      operation: ['like', 'nlike'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'customer.full_name',
          OPERATION_MAP[operation],
          `%${value}%`
        );

        currentFilters.push({
          key: 'full_name',
          operation,
          value
        });
      }
    },
    {
      key: 'email',
      operation: ['eq', 'like', 'nlike'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'customer.email',
          OPERATION_MAP[operation],
          value
        );

        currentFilters.push({
          key: 'email',
          operation,
          value
        });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'customer.status',
          OPERATION_MAP[operation],
          value
        );

        currentFilters.push({
          key: 'status',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const customerCollectionSortBy = getValueSync(
          'customerCollectionSortBy',
          {
            email: (query: QueryBuilder) =>
              query.orderBy('customer.email'),

            name: (query: QueryBuilder) =>
              query.orderBy('customer.full_name'),

            status: (query: QueryBuilder) =>
              query.orderBy('customer.status'),

            created_at: (query: QueryBuilder) =>
              query.orderBy('customer.created_at')
          }
        ) as Record<string, (query: QueryBuilder) => QueryBuilder>;

        if (customerCollectionSortBy[value as string]) {
          customerCollectionSortBy[value as string](query);

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