import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getValue } from '../../../lib/util/registry.js';

interface AttributeCollectionFilter {
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
  operation: string;
  value: string;
}

interface AttributeCollectionRow {
  [key: string]: unknown;
}

export class AttributeCollection {
  private baseQuery: any;
  private filters: CurrentFilter[] = [];
  private totalQuery: any;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.totalQuery = baseQuery.clone();
  }

  async init(filters: CurrentFilter[] = []): Promise<void> {
    const currentFilters: CurrentFilter[] = [];

    // Apply the filters
    const attributeCollectionFilters =
      (await getValue<AttributeCollectionFilter[]>(
        'attributeCollectionFilters',
        []
      )) ?? [];

    attributeCollectionFilters.forEach((filter) => {
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
      'COUNT(attribute.attribute_id)',
      'total'
    );

    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.filters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items(): Promise<AttributeCollectionRow[]> {
    const items = await this.baseQuery.execute(pool);

    return items.map((row: AttributeCollectionRow) =>
      camelCase(row)
    );
  }

  async total(): Promise<number> {
    // Call items to get the total
    const total = await this.totalQuery.execute(pool);

    return Number(total[0].total);
  }

  currentFilters(): CurrentFilter[] {
    return this.filters;
  }
}