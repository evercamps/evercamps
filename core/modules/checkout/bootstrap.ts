import { select } from '@evershop/postgres-query-builder';
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

  // Resolves the product_variant of a cart item: the requested variant, or the
  // product's default variant when none is requested. Returns null when there
  // is none (a product with only real variants and none chosen - it then
  // falls back to product-level sku/price/stock). Includes the seats already
  // reserved by orders, so the inventory field can check availability.
  addProcessor('cartItemVariantLoaderFunction', () => {
    return async (productId: number, variantId: number | null | undefined) => {
      const query = select(
        'product_variant.product_variant_id',
        'product_variant.product_id',
        'product_variant.sku',
        'product_variant.price',
        'product_variant.title',
        'product_variant.is_default',
        'product_variant.status',
        'inventory_item.inventory_item_id',
        'inventory_item.total_seats'
      ).from('product_variant');
      query
        .leftJoin('inventory_item')
        .on('inventory_item.variant_id', '=', 'product_variant.product_variant_id');
      if (variantId) {
        query.where('product_variant.product_variant_id', '=', variantId);
      } else {
        query
          .where('product_variant.product_id', '=', productId)
          .and('product_variant.is_default', '=', true);
      }
      const variant = await query.load(pool);
      if (!variant) {
        return null;
      }

      let reservedSeats = 0;
      if (variant.inventory_item_id) {
        const reserved = await select()
          .from('inventory_reservation')
          .select('COALESCE(SUM(seats_held), 0)', 'reserved')
          .where('inventory_item_id', '=', variant.inventory_item_id)
          // Only committed (order) holds exist today; expiring cart-time holds
          // are a later follow-up (variation-plan, Phase 3).
          .andWhere('expires_at', 'IS NULL', null)
          .load(pool);
        reservedSeats = parseInt(reserved?.reserved ?? 0, 10);
      }
      return { ...variant, reserved_seats: reservedSeats };
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