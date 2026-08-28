import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import type { Pool } from 'pg';

interface Product {
  productId: number;
}

interface Context {
  pool: Pool;
}

export default {
  Product: {
    variants: async (
      { productId }: Product,
      _: unknown,
      { pool }: Context
    ) => {
      const query = select()
        .from('product_variant');

      query
        .leftJoin('inventory_item')
        .on(
          'inventory_item.variant_id',
          '=',
          'product_variant.product_variant_id'
        );

      query
        .select('product_variant.product_variant_id')
        .select('product_variant.uuid')
        .select('product_variant.sku')
        .select('product_variant.price')
        .select('product_variant.title')
        .select('product_variant.is_default')
        .select('inventory_item.total_seats');

      query.where(
        'product_variant.product_id',
        '=',
        productId
      );

      const variants = await query.execute(pool);

      return variants.map((variant) => camelCase(variant));
    }
  }
};