import { node, select, sql } from '@evershop/postgres-query-builder';
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

interface VariantGroup {
  variant_group_id: number;
}

interface ProductIdRow {
  product_id: number;
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
        .where('type', '=', 'select')
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
      // Visibility for variant groups
      const copy = this.baseQuery.clone();

      // Get all groups that have at least 1 visible item
      const visibleGroups =
        (await select('variant_group_id')
          .from('variant_group')
          .where('visibility', '=', 't')
          .execute(pool)) as VariantGroup[];

      const visibleGroupIds = visibleGroups.map(
        (group) => group.variant_group_id
      );

      if (visibleGroupIds.length > 0) {
        // Get all invisible variants from current query
        copy
          .select('bool_or(product.visibility)', 'sumv')
          .select(
            'max(product.product_id)',
            'product_id'
          )
          .andWhere(
            'product.variant_group_id',
            'IN',
            visibleGroupIds
          );

        copy.groupBy('product.variant_group_id');
        copy.orderBy(
          'product.variant_group_id',
          'ASC'
        );
        copy.having(
          'bool_or(product.visibility)',
          '=',
          'f'
        );

        const invisibleIds = (
          (await copy.execute(pool)) as ProductIdRow[]
        ).map((product) => product.product_id);

        if (invisibleIds.length > 0) {
          const n = node('AND');

          n.addLeaf(
            'AND',
            'product.product_id',
            'IN',
            invisibleIds
          ).addNode(
            node('OR').addLeaf(
              'OR',
              'product.visibility',
              '=',
              't'
            )
          );

          this.baseQuery.getWhere().addNode(n);
        } else {
          this.baseQuery.andWhere(
            'product.visibility',
            '=',
            't'
          );
        }
      } else {
        this.baseQuery.andWhere(
          'product.visibility',
          '=',
          't'
        );
      }
    } else {
      const onePerVariantGroupQuery =
        this.baseQuery.clone();

      onePerVariantGroupQuery.removeLimit();

      onePerVariantGroupQuery.select(
        sql(
          'DISTINCT ON (COALESCE(product.variant_group_id, random())) product.product_id AS product_id'
        )
      );

      onePerVariantGroupQuery.removeOrderBy();

      const onePerGroup =
        (await onePerVariantGroupQuery.execute(
          pool
        )) as ProductIdRow[];

      this.baseQuery.andWhere(
        'product.product_id',
        'IN',
        onePerGroup.map(
          (product) => product.product_id
        )
      );
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