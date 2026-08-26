import { del, insert, insertOnUpdate, select, update } from '@evershop/postgres-query-builder';
import { buildVariantOptionHash, pool } from '../core.js';
import {
  findVariationMapByExternalId,
  recordVariantCreated,
  recordVariantFailed,
  recordVariantUpdated
} from '../services/importBatch.js';
import type { WooCommerceProduct, WooCommerceVariation } from '../types.js';
import { DEFAULT_ATTRIBUTE_GROUP_ID } from './mapProduct.js';
import {
  mapVariant,
  variantInputFromSimpleProduct,
  variantInputFromVariation,
  type VariantImportInput
} from './mapVariant.js';

function slugifyAttributeCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// WooCommerce attributes aren't tagged with evercamps attribute ids, so
// matching happens by attribute_code (slugified name) - two WC products using
// an attribute named "Size" resolve to the same evercamps attribute row.
// Options are matched by (attribute_id, option_text) since attribute_option
// has no DB-level uniqueness on that pair (same as the admin-created path).
export async function resolveAttributeAndOption(
  attributeName: string,
  optionText: string
): Promise<{ attribute_id: number; option_id: number }> {
  const code = slugifyAttributeCode(attributeName);

  let attribute = await select('attribute_id')
    .from('attribute')
    .where('attribute_code', '=', code)
    .load(pool);

  if (!attribute) {
    const created = await insert('attribute')
      .given({
        attribute_code: code,
        attribute_name: attributeName,
        type: 'select',
        is_required: false,
        display_on_frontend: true
      })
      .execute(pool);
    attribute = { attribute_id: created.insertId };
    await insertOnUpdate('attribute_group_link', ['attribute_id', 'group_id'])
      .given({ attribute_id: attribute.attribute_id, group_id: DEFAULT_ATTRIBUTE_GROUP_ID })
      .execute(pool);
  }

  let option = await select('attribute_option_id')
    .from('attribute_option')
    .where('attribute_id', '=', attribute.attribute_id)
    .and('option_text', '=', optionText)
    .load(pool);

  if (!option) {
    const created = await insert('attribute_option')
      .given({
        attribute_id: attribute.attribute_id,
        attribute_code: code,
        option_text: optionText
      })
      .execute(pool);
    option = { attribute_option_id: created.insertId };
  }

  return { attribute_id: attribute.attribute_id, option_id: option.attribute_option_id };
}

async function syncSingleVariant(
  productId: number,
  input: VariantImportInput,
  parent: WooCommerceProduct,
  batchId: number
): Promise<void> {
  const data = mapVariant(input, parent);
  const existingMap = await findVariationMapByExternalId(input.external_variation_id);

  let variantId: number;
  if (existingMap && existingMap.product_variant_id) {
    variantId = existingMap.product_variant_id;
    await update('product_variant')
      .given({ sku: data.sku, price: data.price, title: data.title, updated_at: new Date() })
      .where('product_variant_id', '=', variantId)
      .execute(pool);
    await recordVariantUpdated(existingMap.woocommerce_variation_map_id, variantId, batchId, input.date_modified);
  } else {
    const created = await insert('product_variant')
      .given({ product_id: productId, sku: data.sku, price: data.price, title: data.title })
      .execute(pool);
    variantId = created.insertId;
    if (existingMap) {
      // A previous run recorded this variation but failed before a
      // product_variant row existed - point the existing map row at it.
      await recordVariantUpdated(existingMap.woocommerce_variation_map_id, variantId, batchId, input.date_modified);
    } else {
      await recordVariantCreated(batchId, input.external_variation_id, variantId, input.date_modified);
    }
  }

  await insertOnUpdate('inventory_item', ['variant_id'])
    .given({ variant_id: variantId, total_seats: data.total_seats })
    .execute(pool);

  // Attribute values and the lookup hash are small per variant - resync from
  // scratch each run instead of diffing, so stale/changed WC data self-heals.
  await del('variant_attribute_value').where('variant_id', '=', variantId).execute(pool);
  const pairs: { attributeId: number; optionId: number }[] = [];
  for (const attribute of data.attributes) {
    const resolved = await resolveAttributeAndOption(attribute.attribute_name, attribute.option_text);
    await insert('variant_attribute_value')
      .given({
        variant_id: variantId,
        attribute_id: resolved.attribute_id,
        option_id: resolved.option_id
      })
      .execute(pool);
    pairs.push({ attributeId: resolved.attribute_id, optionId: resolved.option_id });
  }

  await del('variant_lookup').where('variant_id', '=', variantId).execute(pool);
  await insert('variant_lookup')
    .given({
      product_id: productId,
      variant_id: variantId,
      option_hash: buildVariantOptionHash(pairs)
    })
    .execute(pool);
}

async function deleteStaleVariants(productId: number, processedExternalIds: Set<number>): Promise<void> {
  const query = select('product_variant.product_variant_id', 'woocommerce_variation_map.external_variation_id').from(
    'product_variant'
  );
  query
    .leftJoin('woocommerce_variation_map')
    .on('woocommerce_variation_map.product_variant_id', '=', 'product_variant.product_variant_id');
  query.where('product_variant.product_id', '=', productId);
  const rows = await query.execute(pool);

  for (const row of rows) {
    if (row.external_variation_id === null || !processedExternalIds.has(row.external_variation_id)) {
      // Cascades to inventory_item, variant_attribute_value, variant_lookup
      // and the woocommerce_variation_map row itself.
      await del('product_variant').where('product_variant_id', '=', row.product_variant_id).execute(pool);
    }
  }
}

// Syncs product_variant/inventory_item/variant_attribute_value/variant_lookup
// for one product. `variations` is the WC variations list for a 'variable'
// product, or empty for a 'simple' product - per the ERD every product has
// at least one variant, so an empty list still produces one synthetic
// default variant built from the product's own fields.
export async function syncProductVariants(
  product: { product_id: number },
  wcProduct: WooCommerceProduct,
  variations: WooCommerceVariation[],
  batchId: number
): Promise<void> {
  const inputs =
    variations.length > 0 ? variations.map(variantInputFromVariation) : [variantInputFromSimpleProduct(wcProduct)];

  const processedExternalIds = new Set<number>();
  const failures: string[] = [];

  for (const input of inputs) {
    processedExternalIds.add(input.external_variation_id);
    try {
      await syncSingleVariant(product.product_id, input, wcProduct, batchId);
    } catch (e) {
      failures.push(`variation ${input.external_variation_id}: ${(e as Error).message}`);
      const existingMap = await findVariationMapByExternalId(input.external_variation_id);
      await recordVariantFailed(
        batchId,
        input.external_variation_id,
        (e as Error).message,
        existingMap?.woocommerce_variation_map_id
      );
    }
  }

  await deleteStaleVariants(product.product_id, processedExternalIds);

  // Surfacing failures here lets the caller's per-product try/catch (in
  // runImport.ts) mark the whole product as failed for this batch, the same
  // granularity used for every other import failure - while the per-variant
  // recordVariantFailed() calls above still preserve which variation(s)
  // specifically failed and why.
  if (failures.length > 0) {
    throw new Error(`Failed to sync ${failures.length} variant(s): ${failures.join('; ')}`);
  }
}
