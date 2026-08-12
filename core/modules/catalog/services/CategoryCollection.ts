import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

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

interface CurrentFilter {
  key: string;
  operation: string | undefined;
  value: string | undefined;
}

interface FilterInput {
  key: string;
  operation: string;
  value: string;
}

export class CategoryCollection {
  baseQuery: any;
  private currentFilters: CurrentFilter[] = [];
  private totalQuery: any;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('category.category_id', 'DESC');
  }

  async init(filters: FilterInput[] = [], isAdmin = false): Promise<void> {
    if (!isAdmin) {
      this.baseQuery.andWhere('category.status', '=', 1);
    }

    const currentFilters: CurrentFilter[] = [];

    // Apply the filters
    const categoryCollectionFilters = await getValue(
      'categoryCollectionFilters',
      [],
      {
        isAdmin
      }
    ) as Filter[];

    categoryCollectionFilters.forEach((filter) => {
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
      'COUNT(category.category_id)',
      'total'
    );

    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items(): Promise<any[]> {
    const items = await this.baseQuery.execute(pool);

    return items.map((row: any) => camelCase(row));
  }

  async total(): Promise<number> {
    const total = await this.totalQuery.execute(pool);

    return total[0].total;
  }

  getCurrentFilters(): CurrentFilter[] {
    return this.currentFilters;
  }
}