import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../../lib/util/camelCase.js';
import type { Pool } from 'pg';

interface Product {
  productId: number;
}

interface Context {
  pool: Pool;
  user?: unknown;
}

export default {
  Product: {
    attributeIndex: async (
      product: Product,
      _: unknown,
      { pool, user }: Context
    ) => {
      const query = select().from('product_attribute_value_index');

      query
        .leftJoin('attribute')
        .on(
          'attribute.attribute_id',
          '=',
          'product_attribute_value_index.attribute_id'
        );

      query.where(
        'product_attribute_value_index.product_id',
        '=',
        product.productId
      );

      if (!user) {
        query.andWhere('attribute.display_on_frontend', '=', true);
      }

      query.orderBy('attribute.sort_order', 'ASC');

      const attributes = await query.execute(pool);

      return attributes.map((a) => camelCase(a));
    },

    attributes: async (
      product: Product,
      _: unknown,
      { pool, user }: Context
    ) => {
      const valueIndex = (
        await select()
          .from('product_attribute_value_index')
          .where('product_id', '=', product.productId)
          .execute(pool)
      ).map((row) => row.attribute_id);

      const attributes = await select()
        .from('attribute')
        .where('attribute_id', 'IN', valueIndex)
        .and(
          'display_on_frontend',
          'IN',
          user ? [true] : [false, true]
        )
        .execute(pool);

      return attributes.map((a) => camelCase(a));
    }
  }
};