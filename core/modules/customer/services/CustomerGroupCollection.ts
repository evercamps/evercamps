import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

interface Filter {
  key: string;
  operation: string;
  value?: string;
}

interface CollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation: string | undefined,
    value: string | undefined,
    currentFilters: Filter[]
  ) => void;
}

export class CustomerGroupCollection {
  private baseQuery: any;
  private totalQuery: any;
  private currentFilterList: Filter[] = [];

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
  }

  async init(
    _args: Record<string, unknown>,
    { filters = [] }: { filters?: Filter[] }
  ): Promise<void> {
    const currentFilters: Filter[] = [];

    const customerGroupCollectionFilters =
      (await getValue(
        'customerGroupCollectionFilters',
        []
      )) as CollectionFilter[];

    customerGroupCollectionFilters.forEach((filter) => {
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

    const totalQuery = this.baseQuery.clone();

    totalQuery.select('COUNT(*)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilterList = currentFilters;
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

  currentFilters(): Filter[] {
    return this.currentFilterList;
  }
}