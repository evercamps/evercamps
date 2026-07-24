import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

export interface Filter {
  key: string;
  operation: string;
  value?: string;
}

interface CollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation?: string,
    value?: string,
    currentFilters?: Filter[]
  ) => void;
}

export class OrderCollection {
  private baseQuery: any;
  private totalQuery: any;
  private _currentFilters: Filter[] = [];

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('order.order_id', 'DESC');
  }

  async init(filters: Filter[] = []): Promise<void> {
    const currentFilters: Filter[] = [];

    const orderCollectionFilters = (await getValue(
      'orderCollectionFilters',
      []
    )) as CollectionFilter[];

    orderCollectionFilters.forEach((filter) => {
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

    totalQuery.select('COUNT("order".order_id)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this._currentFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items(): Promise<any[]> {
    const items = await this.baseQuery.execute(pool);

    return items.map((row: Record<string, unknown>) =>
      camelCase(row)
    );
  }

  async total(): Promise<number> {
    const total = await this.totalQuery.execute(pool);

    return total[0].total;
  }

  currentFilters(): Filter[] {
    return this._currentFilters;
  }
}