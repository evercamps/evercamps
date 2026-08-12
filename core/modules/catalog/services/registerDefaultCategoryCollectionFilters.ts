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
  value: string | null;
}

interface CategoryCollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: QueryBuilder,
    operation: string,
    value: string | null,
    currentFilters: CurrentFilter[]
  ) => void;
}

type SortFunction = (
  query: QueryBuilder,
  operation: string
) => QueryBuilder;

export default async function registerDefaultCategoryCollectionFilters(
  this: { isAdmin: boolean }
): Promise<CategoryCollectionFilter[]> {
  const { isAdmin } = this;

  // List of default supported filters
  const defaultFilters: CategoryCollectionFilter[] = [
    {
      key: 'name',
      operation: ['like'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'category_description.name',
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
      key: 'status',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'category.status',
          OPERATION_MAP[operation],
          value ?? ''
        );

        currentFilters.push({
          key: 'status',
          operation,
          value
        });
      }
    },
    {
      key: 'include_in_nav',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          'category.include_in_nav',
          OPERATION_MAP[operation],
          value ?? ''
        );

        currentFilters.push({
          key: 'include_in_nav',
          operation,
          value
        });
      }
    },
    {
      key: 'parent',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        if (value === null) {
          query.andWhere(
            'category.parent_id',
            'IS NULL'
          );
        } else {
          query.andWhere(
            'category.parent_id',
            OPERATION_MAP[operation],
            value
          );
        }

        currentFilters.push({
          key: 'parent',
          operation,
          value
        });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query, operation, value, currentFilters) => {
        const categorySortBy = getValueSync<
          Record<string, SortFunction>
        >(
          'categoryCollectionSortBy',
          {
            name: (query) =>
              query.orderBy('category_description.name'),

            include_in_nav: (query) =>
              query.orderBy('category.include_in_nav'),

            status: (query) =>
              query.orderBy('category.status')
          },
          {
            isAdmin
          }
        );

        if (value !== null && categorySortBy[value]) {
          categorySortBy[value](query, operation);

          currentFilters.push({
            key: 'ob',
            operation,
            value
          });
        } else {
          query.orderBy(
            'category.category_id',
            'DESC'
          );
        }
      }
    }
  ];

  return defaultFilters;
}