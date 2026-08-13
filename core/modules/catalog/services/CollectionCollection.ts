import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

interface FilterInput {
  key: string;
  operation: string;
  value: string;
}

interface CurrentFilter {
  key: string;
  operation: string;
  value: string;
}

interface CollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation: string | undefined,
    value: string | undefined,
    currentFilters: CurrentFilter[]
  ) => void;
}

export class CollectionCollection {
  baseQuery: any;
  private currentFiltersData: CurrentFilter[] = [];
  private totalQuery: any;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('collection.collection_id', 'DESC');
  }

  async init(filters: FilterInput[] = []): Promise<void> {
    const currentFilters: CurrentFilter[] = [];

    // Apply the filters
    const collectionCollectionFilters =
      (await getValue<CollectionFilter[]>(
        'collectionCollectionFilters',
        []
      )) ?? [];

    collectionCollectionFilters.forEach((filter) => {
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
      'COUNT(collection.collection_id)',
      'total'
    );

    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentFiltersData = currentFilters;
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
    return this.currentFiltersData;
  }
}