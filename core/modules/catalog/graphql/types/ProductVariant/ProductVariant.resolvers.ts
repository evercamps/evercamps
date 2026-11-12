import { select } from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { formatOptionDate } from '../../../services/attribute/optionPeriod.js';

interface Product {
  productId: number;
}

interface Context {
  pool: Pool;
}

const YEAR_SUFFIX = /\s(\d{4})$/;

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
        'product_variant.status',
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
    },

    bookableVariants: async (product: Product, _: unknown, { pool }: Context) => {
      const inventory = await select('manage_stock')
        .from('product_inventory')
        .where('product_inventory_product_id', '=', product.productId)
        .load(pool);
      const manageStock = inventory?.manage_stock === true;

      const query = select(
        'product_variant.product_variant_id',
        'product_variant.sku',
        'product_variant.price',
        'product_variant.title',
        'product_variant.is_default',
        'inventory_item.inventory_item_id',
        'inventory_item.total_seats'
      ).from('product_variant');
      query
        .leftJoin('inventory_item')
        .on('inventory_item.variant_id', '=', 'product_variant.product_variant_id');
      // Disabled variants aren't bookable.
      query
        .where('product_variant.product_id', '=', product.productId)
        .and('product_variant.status', '=', true);
      const variants = await query.execute(pool);
      if (variants.length === 0) {
        return [];
      }
      const variantIds = variants.map((v) => v.product_variant_id);

      const optionQuery = select(
        'variant_attribute_value.variant_id',
        'attribute_option.option_text',
        'attribute_option.start_date',
        'attribute_option.end_date'
      ).from('variant_attribute_value');
      optionQuery
        .innerJoin('attribute_option')
        .on('attribute_option.attribute_option_id', '=', 'variant_attribute_value.option_id');
      optionQuery.where('variant_attribute_value.variant_id', 'IN', variantIds);
      const options = await optionQuery.execute(pool);

      const reservedQuery = select('inventory_item_id')
        .from('inventory_reservation')
        .select('COALESCE(SUM(seats_held), 0)', 'reserved');
      reservedQuery
        .where('inventory_item_id', 'IN', variants.map((v) => v.inventory_item_id).filter(Boolean).concat([0]))
        .andWhere('expires_at', 'IS NULL', null);
      reservedQuery.groupBy('inventory_item_id');
      const reserved = await reservedQuery.execute(pool);
      const reservedByItem = new Map(reserved.map((r) => [r.inventory_item_id, parseInt(r.reserved, 10)]));

      const today = todayString();
      const currentYear = new Date().getFullYear();

      return variants
        .map((variant) => {
          const own = options.filter((o) => o.variant_id === variant.product_variant_id);
          const dated = own.find((o) => o.start_date);
          const startDate = dated ? formatOptionDate(dated.start_date) : null;
          const endDate = dated ? formatOptionDate(dated.end_date) : null;
          const label = variant.title || own.map((o) => o.option_text).join(' / ') || variant.sku;

          // Not bookable any more: the period has ended, or - without dates -
          // an option of an earlier year ("Week 1 zomer 2025").
          let past = false;
          if (endDate) {
            past = endDate < today;
          } else {
            past = own.some((o) => {
              const match = String(o.option_text).match(YEAR_SUFFIX);
              return match ? parseInt(match[1], 10) < currentYear : false;
            });
          }

          const availableSeats = manageStock
            ? parseInt(variant.total_seats ?? 0, 10) - (reservedByItem.get(variant.inventory_item_id) ?? 0)
            : null;
          return {
            productVariantId: variant.product_variant_id,
            sku: variant.sku,
            label,
            price: variant.price,
            isDefault: variant.is_default,
            startDate,
            endDate,
            availableSeats: availableSeats === null ? null : Math.max(availableSeats, 0),
            soldOut: availableSeats !== null && availableSeats < 1,
            past
          };
        })
        .filter((variant) => !variant.past)
        .sort((a, b) => a.label.localeCompare(b.label, 'nl', { numeric: true, sensitivity: 'base' }));
    }
  }
};
