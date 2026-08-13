import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getFilterableAttributes } from '../../../../../modules/catalog/services/getFilterableAttributes.js';
import { getProductsBaseQuery } from '../../../../../modules/catalog/services/getProductsBaseQuery.js';
import { ProductCollection } from '../../../../../modules/catalog/services/ProductCollection.js';
import type { Pool } from 'pg';

interface Product {
  uuid: string;
  description: string;
}

interface Context {
  pool: Pool;
  user?: unknown;
}

export default {
  Product: {
    url: async (
      product: Product,
      _: unknown,
      { pool }: Context
    ): Promise<string> => {
      const urlRewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', product.uuid)
        .and('entity_type', '=', 'product')
        .load(pool);

      if (!urlRewrite) {
        return buildUrl('productView', {
          uuid: product.uuid
        });
      }

      return urlRewrite.request_path;
    },

    description: ({ description }: Product) => {
      try {
        return JSON.parse(description);
      } catch {
        const rowId = `r__${uuidv4()}`;

        return [
          {
            size: 1,
            id: rowId,
            columns: [
              {
                id: 'c__c5d90067-c786-4324-8e24-8e30520ac3d7',
                size: 1,
                data: {
                  time: 1723347125344,
                  blocks: [
                    {
                      id: 'AU89ItzUa7',
                      type: 'raw',
                      data: {
                        html: description
                      }
                    }
                  ],
                  version: '2.30.2'
                }
              }
            ]
          }
        ];
      }
    }
  },

  Query: {
    product: async (
      _: unknown,
      { id }: { id: number },
      { pool }: Context
    ) => {
      const query = getProductsBaseQuery();

      query.where('product.product_id', '=', id);

      const result = await query.load(pool);

      return result ? camelCase(result) : null;
    },

    products: async (
      _: unknown,
      { filters = [] }: { filters?: unknown[] },
      { user }: Context
    ) => {
      const query = getProductsBaseQuery();
      const root = new ProductCollection(query);

      await root.init(filters as any, !!user);

      return root;
    },
    availableAttributes: async () => {
      const results = await getFilterableAttributes();
      return results;
    },
    priceRange: async (_: unknown, __: unknown, { pool }: Context) => {
      const query = getProductsBaseQuery();
      query
        .select('MIN(product.price)', 'min')
        .select('MAX(product.price)', 'max');
      const result = await query.load(pool);
      return {
        min: result.min || 0,
        max: result.max || 0
      };
    }
  }
};