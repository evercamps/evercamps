import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValueSync } from '../../../lib/util/registry.js';

interface QueryBuilder {
  andWhere(
    column: string,
    operation: string,
    value?: string
  ): QueryBuilder;

  orderBy(
    column: string,
    direction?: string
  ): QueryBuilder;
}

interface CurrentFilter {
  key: string;
  operation: string;
  value: string;
}

interface CollectionCollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: QueryBuilder,
    operation: string,
    value: string,
    currentFilters: CurrentFilter[]
  ) => void;
}

type SortFunction = (
  query: QueryBuilder,
  operation: string
) => QueryBuilder;

export default async function registerDefaultCollectionCollectionFilters(): Promise<
  CollectionCollectionFilter[]
> {
  // List of default supported filters
  const defaultFilters: CollectionCollectionFilter[] = [
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'collection.name',
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
      key: 'code',
      operation: ['like', 'eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'collection.code',
          OPERATION_MAP[operation],
          `%${value}%`
        );

        currentFilters.push({
          key: 'code',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const collectionSortBy = getValueSync<
          Record<string, SortFunction>
        >('collectionCollectionSortBy', {
          name: (query) =>
            query.orderBy('collection.name'),

          code: (query) =>
            query.orderBy('collection.code')
        });

        if (collectionSortBy[value]) {
          collectionSortBy[value](query, operation);

          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        } else {
          query.orderBy(
            'collection.collection_id',
            'DESC'
          );
        }
      }
    }
  ];

  return defaultFilters;
}