import {
  insert,
  insertOnUpdate,
  select,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

// Every product has at least one product_variant. A product without real
// variants has exactly one, flagged is_default, mirroring the product's own
// sku/price/qty (see core/.docs/variation-plan.md, Phase 1). Products with
// several real variants (e.g. imported WooCommerce variations) have no default
// and are never touched here.

type DefaultVariantSource = {
  sku?: string;
  price?: number | string;
  qty?: number | string;
};

// product_variant.sku is globally unique; fall back to "<sku>-<productId>" when
// another variant already uses the product's sku (same rule as the backfill in
// catalog/migration/Version-1.1.1.ts).
async function resolveVariantSku(
  sku: string,
  productId: number,
  connection: PoolClient,
  ignoreVariantId?: number
): Promise<string> {
  const query = select('product_variant_id')
    .from('product_variant')
    .where('sku', '=', sku);
  if (ignoreVariantId) {
    query.and('product_variant_id', '!=', ignoreVariantId);
  }
  const taken = await query.load(connection, false);
  return taken ? `${sku}-${productId}` : sku;
}

function toSeats(qty: number | string | undefined): number {
  const seats = parseInt(String(qty ?? 0), 10);
  return Number.isNaN(seats) ? 0 : seats;
}

/**
 * Create the default variant (+ inventory_item) for a product that has no
 * variant yet. No-op when the product already has one or more variants.
 */
export async function ensureDefaultVariant(
  source: DefaultVariantSource,
  productId: number,
  connection: PoolClient
): Promise<void> {
  const existing = await select('product_variant_id')
    .from('product_variant')
    .where('product_id', '=', productId)
    .load(connection, false);
  if (existing) {
    return;
  }

  const variant = await insert('product_variant')
    .given({
      product_id: productId,
      sku: await resolveVariantSku(String(source.sku), productId, connection),
      price: source.price ?? 0,
      title: null,
      is_default: true
    })
    .execute(connection, false);

  await insert('inventory_item')
    .given({
      variant_id: variant.insertId,
      total_seats: toSeats(source.qty)
    })
    .execute(connection, false);
}

/**
 * Keep the default variant in sync with the product after an update. Only
 * applies when the product's single variant is the default one; products with
 * real variants are left alone (the importer / variant UI own those).
 *
 * `changes` is the (partial) update payload: only fields present in it are
 * synced. `product` is the product row after the update, used to create a
 * default variant if one is somehow missing.
 */
export async function syncDefaultVariant(
  changes: DefaultVariantSource,
  product: { product_id: number; sku: string; price: number | string },
  connection: PoolClient
): Promise<void> {
  const variants = await select('product_variant_id', 'sku', 'is_default')
    .from('product_variant')
    .where('product_id', '=', product.product_id)
    .execute(connection, false);

  if (variants.length === 0) {
    await ensureDefaultVariant(
      { sku: product.sku, price: product.price, qty: changes.qty },
      product.product_id,
      connection
    );
    return;
  }

  if (variants.length !== 1 || !variants[0].is_default) {
    return;
  }

  const variant = variants[0];
  const given: Record<string, any> = {};
  if (changes.sku !== undefined && changes.sku !== variant.sku) {
    given.sku = await resolveVariantSku(
      String(changes.sku),
      product.product_id,
      connection,
      variant.product_variant_id
    );
  }
  if (changes.price !== undefined) {
    given.price = changes.price;
  }
  if (Object.keys(given).length > 0) {
    given.updated_at = new Date();
    await update('product_variant')
      .given(given)
      .where('product_variant_id', '=', variant.product_variant_id)
      .execute(connection, false);
  }

  if (changes.qty !== undefined) {
    // inventory_item.total_seats is the total capacity, while the product qty
    // the admin edits is what's still free: the legacy
    // reduce_product_stock_when_order_placed trigger lowers it on every order,
    // and those same orders hold inventory_reservation rows. So capacity =
    // free qty + seats already reserved, otherwise sold seats count twice.
    const inventoryItem = await select('inventory_item_id')
      .from('inventory_item')
      .where('variant_id', '=', variant.product_variant_id)
      .load(connection, false);
    let reservedSeats = 0;
    if (inventoryItem) {
      const reserved = await select()
        .from('inventory_reservation')
        .select('COALESCE(SUM(seats_held), 0)', 'reserved')
        .where('inventory_item_id', '=', inventoryItem.inventory_item_id)
        .andWhere('expires_at', 'IS NULL', null)
        .load(connection, false);
      reservedSeats = parseInt(reserved?.reserved ?? 0, 10);
    }
    await insertOnUpdate('inventory_item', ['variant_id'])
      .given({
        variant_id: variant.product_variant_id,
        total_seats: toSeats(changes.qty) + reservedSeats
      })
      .execute(connection, false);
  }
}
