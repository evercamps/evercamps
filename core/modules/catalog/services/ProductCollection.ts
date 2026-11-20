import { node, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { camelCase } from '../../../lib/util/camelCase.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getValue } from '../../../lib/util/registry.js';

interface FilterInput {
  key: string;
  operation: string;
  value: string;
}

interface CurrentFilter {
  key: string;
  operation: string | undefined;
  value: string | undefined;
}

interface ProductCollectionFilter {
  key: string;
  operation: string[];
  callback: (
    query: any,
    operation: string | undefined,
    value: string | undefined,
    currentFilters: CurrentFilter[]
  ) => void;
}

interface Attribute {
  attribute_id: number;
  attribute_code: string;
  attribute_name: string;
  type: string;
  is_filterable: number;
}

export class ProductCollection {
  baseQuery: any;
  private currentFiltersData: CurrentFilter[] = [];
  private totalQuery: any;

  constructor(baseQuery: any) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy('product.product_id', 'DESC');
  }

  /**
   * @param filters Product filters
   * @param isAdmin Whether the current user is an admin
   */
  async init(
    filters: FilterInput[] = [],
    isAdmin = false
  ): Promise<void> {
    // If the user is not admin, we need to filter out the
    // out of stock products and the disabled products
    if (!isAdmin) {
      this.baseQuery.andWhere('product.status', '=', 1);

      if (
        getConfig('catalog.showOutOfStockProduct', false) === false
      ) {
        this.baseQuery
          .andWhere(
            'product_inventory.manage_stock',
            '=',
            false
          )
          .addNode(
            node('OR')
              .addLeaf(
                'AND',
                'product_inventory.qty',
                '>',
                0
              )
              .addLeaf(
                'AND',
                'product_inventory.stock_availability',
                '=',
                true
              )
          );
      }
    }

    const currentFilters: CurrentFilter[] = [];

    // Attribute filter
    const filterableAttributes =
      (await select()
        .from('attribute')
        .where('type', 'IN', ['select', 'period'])
        .and('is_filterable', '=', 1)
        .execute(pool)) as Attribute[];

    // Apply the filters
    const productCollectionFilters =
      (await getValue<ProductCollectionFilter[]>(
        'productCollectionFilters',
        [],
        {
          isAdmin,
          filterableAttributes
        }
      )) ?? [];

    productCollectionFilters.forEach((filter) => {
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

    if (!isAdmin) {
      this.baseQuery.andWhere('product.visibility', '=', 't');
    }

    // Clone the main query for getting total right before
    // doing the paging
    const totalQuery = this.baseQuery.clone();

    totalQuery.select(
      'COUNT(product.product_id)',
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