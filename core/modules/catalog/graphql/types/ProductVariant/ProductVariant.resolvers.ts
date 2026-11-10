import { select } from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { camelCase } from '../../../../../lib/util/camelCase.js';

interface Product {
  productId: number;
}

interface Context {
  pool: Pool;
}

export default {
  Product: {
    variants: async (product: Product, _: unknown, { pool }: Context) => {
      const query = select(
        'product_variant.product_variant_id',
        'product_variant.uuid',
        'product_variant.sku',
        'product_variant.price',
        'product_variant.title',
        'product_variant.is_default',
        'inventory_item.total_seats'
      ).from('product_variant');
      query
        .leftJoin('inventory_item')
        .on('inventory_item.variant_id', '=', 'product_variant.product_variant_id');
      query.where('product_variant.product_id', '=', product.productId);
      query.orderBy('product_variant.product_variant_id', 'ASC');

      const rows = await query.execute(pool);
      // Default variant first, then in creation order. (The query builder only
      // supports a single ORDER BY column.) `price` stays the raw number; the
      // shared Price type resolver formats it.
      return rows
        .map((row) => camelCase(row))
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    }
  }
};
