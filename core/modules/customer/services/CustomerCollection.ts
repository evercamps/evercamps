import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

interface CollectionFilter {
  key: string;
  operation: string;
  value?: unknown;
}

interface RegisteredFilter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation?: string,
    value?: unknown,
    currentFilters?: unknown[]
  ) => void;
}

export class CustomerCollection {
  private baseQuery: any;
  private totalQuery: any;
  private currentFilterList: unknown[] = [];

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('customer.customer_id', 'DESC');
  }

  async init(filters: CollectionFilter[] = []): Promise<void> {
    const currentFilters: unknown[] = [];

    const customerCollectionFilters =
      (await getValue<RegisteredFilter[]>(
        'customerCollectionFilters',
        []
      )) ?? [];

    customerCollectionFilters.forEach((filter) => {
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

    totalQuery.select('COUNT(customer.customer_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilterList = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items(): Promise<Record<string, unknown>[]> {
    const items = await this.baseQuery.execute(pool);

    return items.map((row: Record<string, unknown>) =>
      camelCase(row)
    );
  }

  async total(): Promise<number> {
    const total = await this.totalQuery.execute(pool);

    return Number(total[0].total);
  }

  currentFilters(): unknown[] {
    return this.currentFilterList;
  }
}