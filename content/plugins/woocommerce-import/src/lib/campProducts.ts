import { del, insert, select, update } from '@evershop/postgres-query-builder';
import { debug, deleteProduct, pool } from '../core.js';
import { getProductUuid } from '../services/importBatch.js';

// One evercamps product per camp type (see migration Version-1.0.4.ts).

export interface CampProduct {
  woocommerce_camp_product_id: number;
  camp_key: string;
  product_id: number;
  latest_year: number | null;
}

export async function findCampProduct(key: string): Promise<CampProduct | null> {
  const row = await select().from('woocommerce_camp_product').where('camp_key', '=', key).load(pool);
  return row || null;
}

export async function saveCampProduct(
  key: string,
  productId: number,
  year: number | null
): Promise<void> {
  const existing = await findCampProduct(key);
  if (!existing) {
    await insert('woocommerce_camp_product')
      .given({ camp_key: key, product_id: productId, latest_year: year })
      .execute(pool);
    return;
  }
  const latestYear =
    year !== null && (existing.latest_year === null || year > existing.latest_year)
      ? year
      : existing.latest_year;
  await update('woocommerce_camp_product')
    .given({ product_id: productId, latest_year: latestYear, updated_at: new Date() })
    .where('woocommerce_camp_product_id', '=', existing.woocommerce_camp_product_id)
    .execute(pool);
}

/** True when a WooCommerce product of `year` is the newest (or only) one of its camp type. */
export function isNewestYear(campProduct: CampProduct | null, year: number | null): boolean {
  if (!campProduct || year === null || campProduct.latest_year === null) {
    return true;
  }
  return year >= campProduct.latest_year;
}

/**
 * Merge an already-imported per-year product into the camp-type product:
 * its variants, registrations and order lines move to `targetProductId`,
 * then the (now empty) per-year product is deleted.
 *
 * - Variants keep their WooCommerce mapping; their lookup rows are dropped
 *   because they're rewritten (with the season suffix) by the variant sync
 *   right after - two year products can have identical, year-less option sets.
 * - The year product's own default variant (made by createProduct for a
 *   variable product) is deleted when nothing uses it.
 */
export async function mergeProductInto(oldProductId: number, targetProductId: number): Promise<void> {
  if (oldProductId === targetProductId) {
    return;
  }

  const variants = await select('product_variant_id', 'is_default')
    .from('product_variant')
    .where('product_id', '=', oldProductId)
    .execute(pool);
  for (const variant of variants) {
    await del('variant_lookup').where('variant_id', '=', variant.product_variant_id).execute(pool);
    await update('product_variant')
      .given({ product_id: targetProductId, is_default: false, updated_at: new Date() })
      .where('product_variant_id', '=', variant.product_variant_id)
      .execute(pool);
  }

  await update('registration')
    .given({ registration_product_id: targetProductId })
    .where('registration_product_id', '=', oldProductId)
    .execute(pool);
  await update('order_item')
    .given({ product_id: targetProductId })
    .where('product_id', '=', oldProductId)
    .execute(pool);
  await update('woocommerce_product_map')
    .given({ product_id: targetProductId, updated_at: new Date() })
    .where('product_id', '=', oldProductId)
    .execute(pool);

  const uuid = await getProductUuid(oldProductId);
  if (uuid) {
    debug(`Merging product ${oldProductId} into camp product ${targetProductId}.`);
    await deleteProduct(uuid, { routeId: 'importProducts' });
  }
}
