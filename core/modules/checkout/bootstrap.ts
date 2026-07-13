import { error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { merge } from '../../lib/util/merge.js';
import { addFinalProcessor, addProcessor } from '../../lib/util/registry.js';
import { getProductsBaseQuery } from '../../modules/catalog/services/getProductsBaseQuery.js';
import { registerCartBaseFields } from '../../modules/checkout/services/cart/registerCartBaseFields.js';
import { registerCartItemBaseFields } from '../../modules/checkout/services/cart/registerCartItemBaseFields.js';
import { sortFields } from '../../modules/checkout/services/cart/sortFields.js';

export default (): void => {
  addProcessor('cartFields', registerCartBaseFields, 0);

  addProcessor('cartItemFields', registerCartItemBaseFields, 0);

  addFinalProcessor('cartFields', (fields: any[]) => {
    try {
      const sortedFields = sortFields(fields);
      return sortedFields;
    } catch (e) {
      error(e);
      throw e;
    }
  });

  addFinalProcessor('cartItemFields', (fields: any[]) => {
    try {
      const sortedFields = sortFields(fields);
      return sortedFields;
    } catch (e) {
      error(e);
      throw e;
    }
  });

  addProcessor('cartItemProductLoaderFunction', () => {
    return async (id: any) => {
      const productQuery = getProductsBaseQuery();
      const product = await productQuery
        .where('product_id', '=', id)
        .load(pool);

      return product;
    };
  });

  addProcessor('configurationSchema', (schema: Record<string, any>) => {
    merge(schema, {
      properties: {
        checkout: {
          type: 'object',
          properties: {
            showShippingNote: {
              type: 'boolean'
            }
          }
        }
      }
    });

    return schema;
  });
};