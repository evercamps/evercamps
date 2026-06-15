import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';
import type { Filter } from '../types/index.js';

export class TaxClassCollection {
  private baseQuery: any;
  private totalQuery: any;
  currentFilters: Filter[] = [];

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
  }

  async init(_args: unknown, { filters = [] }: { filters: Filter[] }) {
    const currentFilters: Filter[] = [];

    const taxClassCollectionFilters = await getValue('taxClassCollectionFilters', []);

    taxClassCollectionFilters.forEach((filter: any) => {
      const check = filters.find(
        (f) => f.key === filter.key && filter.operation.includes(f.operation)
      );
      if (filter.key === '*' || check) {
        filter.callback(this.baseQuery, check?.operation, check?.value, currentFilters);
      }
    });

    const totalQuery = this.baseQuery.clone();
    totalQuery.select('COUNT(*)', 'total');
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items() {
    const items = await this.baseQuery.execute(pool);
    return items.map((row: any) => camelCase(row));
  }

  async total() {
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }
}
