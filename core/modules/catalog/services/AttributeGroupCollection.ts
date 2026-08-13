import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';
import { getValue, getValueSync } from '../../../lib/util/registry.js';

interface CurrentFilter {
  key: string;
  operation: string;
  value: string;
}

interface Filter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation: string | undefined,
    value: string | undefined,
    currentFilters: CurrentFilter[]
  ) => void;
}

export class AttributeGroupCollection {
  private baseQuery: any;
  private filters: CurrentFilter[] = [];
  private totalQuery: any;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.totalQuery = baseQuery.clone();
  }

  async init(filters: CurrentFilter[] = []): Promise<void> {
    const currentFilters: CurrentFilter[] = [];

    const defaultFilters: Filter[] = [
      {
        key: 'name',
        operation: ['eq', 'like', 'nlike'],
        callback: (
          query,
          operation,
          value,
          currentFilters
        ) => {
          if (!operation || value === undefined) {
            return;
          }

          query.andWhere(
            'attribute_group.group_name',
            OPERATION_MAP[operation],
            value
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
        callback: (
          query,
          operation,
          value,
          currentFilters
        ) => {
          if (!operation || value === undefined) {
            return;
          }

          const attributeGroupsSortBy = getValueSync<
            Record<string, (query: any, operation?: string) => void>
          >('attributeGroupsSortBy', {
            name: (query: any) =>
              query.orderBy('attribute_group.group_name')
          });

          if (attributeGroupsSortBy[value]) {
            attributeGroupsSortBy[value](query, operation);

            currentFilters.push({
              key: 'ob',
              operation,
              value
            });
          }
        }
      }
    ];

    // Apply the filters
    const attributeGroupCollectionFilters =
      (await getValue<Filter[]>(
        'attributeGroupCollectionFilters',
        defaultFilters
      )) ?? defaultFilters;

    attributeGroupCollectionFilters.forEach((filter) => {
      const check = filters.find(
        (f) =>
          f.key === filter.key &&
          filter.operation.includes(f.operation)
      );

      if (filter.key === '*' || check) {
        filter.callback(
          this.baseQuery,
          check?.operation,
          check?.value,
          currentFilters
        );
      }
    });

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();

    totalQuery.select(
      'COUNT(attribute_group.attribute_group_id)',
      'total'
    );

    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.filters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items(): Promise<any[]> {
    const items = await this.baseQuery.execute(pool);

    return items.map((row: any) => camelCase(row));
  }

  async total(): Promise<number> {
    const total = await this.totalQuery.execute(pool);

    return Number(total[0].total);
  }

  currentFilters(): CurrentFilter[] {
    return this.filters;
  }
}