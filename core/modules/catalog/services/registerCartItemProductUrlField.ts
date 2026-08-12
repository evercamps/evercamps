import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { buildUrl } from '../../../lib/router/buildUrl.js';

interface Field {
  key: string;
  resolvers: Array<() => Promise<string | null>>;
  dependencies: string[];
}

interface ResolverContext {
  getProduct: () => Promise<{
    uuid: string;
  }>;
  getData: (key: string) => unknown;
}

export const registerCartItemProductUrlField = (
  fields: Field[]
): Field[] => {
  const newFields = fields.concat([
    {
      key: 'productUrl',
      resolvers: [
        async function resolver(
          this: ResolverContext
        ): Promise<string | null> {
          const product = await this.getProduct();

          if (!this.getData('product_id')) {
            return null;
          }

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
        }
      ],
      dependencies: ['product_id']
    }
  ]);

  return newFields;
};