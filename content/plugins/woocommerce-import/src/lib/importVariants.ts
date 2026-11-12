import { del, insert, insertOnUpdate, select, update } from '@evershop/postgres-query-builder';
import { buildVariantOptionHash, debug, pool } from '../core.js';
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
import {
  applySeason,
  isSeasonAttribute,
  SEASON_ATTRIBUTE_CODE,
  seasonForDate,
  seasonOf,
  slugifyAttributeCode,
  stripSeason,
  stripSkuSeason,
  withSeason
} from './season.js';

type OptionPair = { attributeId: number; optionId: number };

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
        // Camp weeks are periods (options with start/end dates); see core
        // catalog migration Version-1.1.3 (type "period").
        type: isSeasonAttribute(attributeName) ? 'period' : 'select',
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

// The product's default variant (created by core createProduct /
// ensureDefaultVariant) that isn't linked to a WooCommerce id yet - a simple
// product adopts it instead of inserting a second variant (which would also
// clash on the unique product_variant.sku).
async function findAdoptableDefaultVariant(productId: number): Promise<number | null> {
  const query = select('product_variant.product_variant_id').from('product_variant');
  query
    .leftJoin('woocommerce_variation_map')
    .on('woocommerce_variation_map.product_variant_id', '=', 'product_variant.product_variant_id');
  query
    .where('product_variant.product_id', '=', productId)
    .and('product_variant.is_default', '=', true)
    // 'IS NULL' (not 'IS', null - that renders as "IS $1", which Postgres rejects).
    .and('woocommerce_variation_map.woocommerce_variation_map_id', 'IS NULL', null);
  const row = await query.load(pool);
  return row ? row.product_variant_id : null;
}

async function hasOtherDefaultVariant(productId: number, variantId?: number): Promise<boolean> {
  const query = select('product_variant_id')
    .from('product_variant')
    .where('product_id', '=', productId)
    .and('is_default', '=', true);
  if (variantId) {
    query.and('product_variant_id', '!=', variantId);
  }
  return !!(await query.load(pool));
}

async function findVariantByHash(productId: number, optionHash: string): Promise<number | null> {
  const row = await select('variant_id')
    .from('variant_lookup')
    .where('product_id', '=', productId)
    .and('option_hash', '=', optionHash)
    .load(pool);
  return row ? row.variant_id : null;
}

/** The variant's kampweek option text, or null when it has no kampweek attribute. */
export async function getSeasonOptionText(variantId: number): Promise<string | null> {
  const query = select('attribute_option.option_text').from('variant_attribute_value');
  query
    .innerJoin('attribute')
    .on('attribute.attribute_id', '=', 'variant_attribute_value.attribute_id');
  query
    .innerJoin('attribute_option')
    .on('attribute_option.attribute_option_id', '=', 'variant_attribute_value.option_id');
  query
    .where('variant_attribute_value.variant_id', '=', variantId)
    .and('attribute.attribute_code', 'IN', [SEASON_ATTRIBUTE_CODE, `pa_${SEASON_ATTRIBUTE_CODE}`]);
  const row = await query.load(pool);
  return row ? row.option_text : null;
}

async function skuExists(sku: string, exceptVariantId?: number): Promise<boolean> {
  const query = select('product_variant_id').from('product_variant').where('sku', '=', sku);
  if (exceptVariantId) {
    query.and('product_variant_id', '!=', exceptVariantId);
  }
  return !!(await query.load(pool));
}

async function uniqueSku(sku: string, variantId: number, exceptVariantId?: number): Promise<string> {
  return (await skuExists(sku, exceptVariantId)) ? `${sku}-${variantId}` : sku;
}

/**
 * Keep a variant as the variant of the season it was used for: give it a
 * season sku ("ABC-2026", or "ABC-old-<id>" for a variant from before seasons
 * existed) so the WC sku is free for the current season's variant, and
 * un-flag it as default. Its options and registrations stay as they are.
 */
async function retireVariant(variantId: number, seasonText: string | null): Promise<void> {
  const variant = await select('sku').from('product_variant').where('product_variant_id', '=', variantId).load(pool);
  const season = seasonText ? seasonOf(seasonText) : null;
  const base = stripSkuSeason(variant.sku);
  const sku = await uniqueSku(
    season ? `${base}-${season}` : `${base}-old-${variantId}`,
    variantId,
    variantId
  );
  await update('product_variant')
    .given({ sku, is_default: false, updated_at: new Date() })
    .where('product_variant_id', '=', variantId)
    .execute(pool);
}

async function writeVariantOptions(
  productId: number,
  variantId: number,
  pairs: OptionPair[],
  optionHash: string
): Promise<void> {
  // Attribute values and the lookup hash are small per variant - resync from
  // scratch each run instead of diffing, so stale/changed WC data self-heals.
  await del('variant_attribute_value').where('variant_id', '=', variantId).execute(pool);
  for (const pair of pairs) {
    await insert('variant_attribute_value')
      .given({ variant_id: variantId, attribute_id: pair.attributeId, option_id: pair.optionId })
      .execute(pool);
  }
  await del('variant_lookup').where('variant_id', '=', variantId).execute(pool);
  await insert('variant_lookup')
    .given({ product_id: productId, variant_id: variantId, option_hash: optionHash })
    .execute(pool);
}

export interface VariantSyncOptions {
  // Year from the WooCommerce product name ("... 2022"), or null when the
  // name has no year (then the current season is used, see season.ts).
  season: number | null;
  // Product name without its year; kampweek option of a simple year product.
  campName: string;
}

// `isSimpleProduct`: the variant is the synthetic one built from a WC simple
// product. Without a year in the product name it is (or becomes) the
// product's default variant; real WC variations and year products never are.
//
// Seasons (see season.ts): the kampweek option gets the season suffix - the
// year from the WC product name, or else the current season. With a year from
// the name the mapped variant only ever holds that year, so it is relabelled
// in place. Without one, a mapped variant that still holds registrations/order
// lines of another season (or of before seasons existed) is kept as that
// season's variant and the WC variation is mapped to a current-season variant.
async function syncSingleVariant(
  productId: number,
  input: VariantImportInput,
  parent: WooCommerceProduct,
  batchId: number,
  isSimpleProduct: boolean,
  options: VariantSyncOptions
): Promise<void> {
  const seasonFromName = options.season !== null;
  const season = options.season ?? seasonForDate(new Date());
  const defaultCandidate = isSimpleProduct && !seasonFromName;
  const data = mapVariant({ ...input, attributes: applySeason(input.attributes, season) }, parent);
  const existingMap = await findVariationMapByExternalId(input.external_variation_id);

  // Resolve the options first: they identify the current season's variant.
  const pairs: OptionPair[] = [];
  for (const attribute of data.attributes) {
    const resolved = await resolveAttributeAndOption(attribute.attribute_name, attribute.option_text);
    pairs.push({ attributeId: resolved.attribute_id, optionId: resolved.option_id });
  }
  const optionHash = buildVariantOptionHash(pairs);

  let variantId: number | null =
    existingMap?.product_variant_id ||
    (isSimpleProduct ? await findAdoptableDefaultVariant(productId) : null);

  // Season roll-over (only when the season comes from the date): the mapped
  // variant belongs to another season and is in use.
  if (variantId && !seasonFromName) {
    const seasonText = await getSeasonOptionText(variantId);
    if (seasonText !== null && seasonOf(seasonText) !== season && (await isVariantInUse(variantId))) {
      debug(`Keeping variant ${variantId} ("${seasonText}") as its own season's variant.`);
      await retireVariant(variantId, seasonText);
      variantId = null;
    }
  }

  // A variant for exactly these options may already exist, e.g. created by the
  // order import for an order placed after the cut-off. Map the WC variation to it.
  const existingSeasonVariant = await findVariantByHash(productId, optionHash);
  if (existingSeasonVariant && existingSeasonVariant !== variantId) {
    if (variantId) {
      // The previously mapped variant isn't in use (checked above); remove it
      // now so its sku doesn't clash with the WC sku below.
      if (await isVariantInUse(variantId)) {
        await retireVariant(variantId, await getSeasonOptionText(variantId));
      } else {
        await del('product_variant').where('product_variant_id', '=', variantId).execute(pool);
      }
    }
    variantId = existingSeasonVariant;
  }

  if (variantId) {
    const given: Record<string, any> = {
      sku: await uniqueSku(data.sku, variantId, variantId),
      price: data.price,
      title: data.title,
      updated_at: new Date()
    };
    if (isSimpleProduct) {
      // A year product's variant is one season among several: never the default.
      given.is_default = defaultCandidate && !(await hasOtherDefaultVariant(productId, variantId));
    }
    await update('product_variant')
      .given(given)
      .where('product_variant_id', '=', variantId)
      .execute(pool);
  } else {
    const created = await insert('product_variant')
      .given({
        product_id: productId,
        sku: data.sku,
        price: data.price,
        title: data.title,
        is_default: defaultCandidate && !(await hasOtherDefaultVariant(productId))
      })
      .execute(pool);
    variantId = created.insertId as number;
  }

  if (existingMap) {
    // Also covers a previous run that recorded this variation but failed
    // before a product_variant row existed, and season roll-overs.
    await recordVariantUpdated(existingMap.woocommerce_variation_map_id, variantId, batchId, input.date_modified);
  } else {
    await recordVariantCreated(batchId, input.external_variation_id, variantId, input.date_modified);
  }
  // Which WC product this variation belongs to (a merged camp product has the
  // variations of several WC products); scopes deleteStaleVariants.
  await update('woocommerce_variation_map')
    .given({ external_product_id: parent.id })
    .where('external_variation_id', '=', input.external_variation_id)
    .execute(pool);

  await insertOnUpdate('inventory_item', ['variant_id'])
    .given({ variant_id: variantId, total_seats: data.total_seats })
    .execute(pool);

  await writeVariantOptions(productId, variantId, pairs, optionHash);
}

/**
 * Order import: the variant of `season` for an order line whose WC variation
 * maps to `baseVariantId`. Same options as the base variant, except the
 * kampweek option, which gets the order's season suffix. Created (sku
 * "<sku>-<season>", same price/seats) when it doesn't exist yet. Variants
 * without a kampweek attribute (simple products, other camps) are returned
 * unchanged.
 */
export async function ensureSeasonVariant(
  productId: number,
  baseVariantId: number,
  season: number
): Promise<number> {
  const query = select(
    'variant_attribute_value.attribute_id',
    'variant_attribute_value.option_id',
    'attribute.attribute_code',
    'attribute.attribute_name',
    'attribute_option.option_text'
  ).from('variant_attribute_value');
  query
    .innerJoin('attribute')
    .on('attribute.attribute_id', '=', 'variant_attribute_value.attribute_id');
  query
    .innerJoin('attribute_option')
    .on('attribute_option.attribute_option_id', '=', 'variant_attribute_value.option_id');
  query.where('variant_attribute_value.variant_id', '=', baseVariantId);
  const rows = await query.execute(pool);

  const seasonRow = rows.find((row: any) => isSeasonAttribute(row.attribute_code));
  if (!seasonRow) {
    return baseVariantId;
  }
  const seasonText = withSeason(seasonRow.option_text, season);
  if (seasonText === seasonRow.option_text) {
    return baseVariantId;
  }

  const seasonOption = await resolveAttributeAndOption(seasonRow.attribute_name, seasonText);
  const pairs: OptionPair[] = rows.map((row: any) =>
    isSeasonAttribute(row.attribute_code)
      ? { attributeId: row.attribute_id, optionId: seasonOption.option_id }
      : { attributeId: row.attribute_id, optionId: row.option_id }
  );
  const optionHash = buildVariantOptionHash(pairs);
  const existing = await findVariantByHash(productId, optionHash);
  if (existing) {
    return existing;
  }

  const base = await select().from('product_variant').where('product_variant_id', '=', baseVariantId).load(pool);
  const baseSeats = await select('total_seats').from('inventory_item').where('variant_id', '=', baseVariantId).load(pool);
  const title = base.title
    ? base.title.includes(seasonRow.option_text)
      ? base.title.replace(seasonRow.option_text, seasonText)
      : `${base.title} ${season}`
    : seasonText;

  let sku = `${stripSkuSeason(base.sku)}-${season}`;
  if (await skuExists(sku)) {
    sku = `${sku}-${baseVariantId}`;
  }
  const created = await insert('product_variant')
    .given({
      product_id: productId,
      sku,
      price: base.price,
      title,
      is_default: false
    })
    .execute(pool);
  const variantId = created.insertId as number;

  await insert('inventory_item')
    .given({ variant_id: variantId, total_seats: baseSeats?.total_seats ?? 0 })
    .execute(pool);
  await writeVariantOptions(productId, variantId, pairs, optionHash);
  debug(`Created season variant ${variantId} "${title}" for variant ${baseVariantId}.`);
  return variantId;
}

/**
 * True when `candidateVariantId` is the pre-season version of
 * `targetVariantId`: same week, but its kampweek option has no year suffix
 * (imported before seasons existed). Registrations/order lines on such a
 * variant are moved to the season variant by the order import.
 */
export async function isUnseasonedTwin(
  candidateVariantId: number,
  targetVariantId: number
): Promise<boolean> {
  const candidateText = await getSeasonOptionText(candidateVariantId);
  if (candidateText === null || seasonOf(candidateText) !== null) {
    return false;
  }
  const targetText = await getSeasonOptionText(targetVariantId);
  return targetText !== null && stripSeason(targetText) === candidateText;
}

// Removes variants of `productId` that no longer exist in WooCommerce. A camp
// product merges several WC (year) products, so only variations of the WC
// product being synced (`wcProductId`) are considered. Older map rows without
// external_product_id only count when the product has a single WC source.
// Variants without any WC mapping (the default variant createProduct made)
// are removed when the product has other variants.
async function deleteStaleVariants(
  productId: number,
  wcProductId: number,
  processedExternalIds: Set<number>
): Promise<void> {
  const query = select(
    'product_variant.product_variant_id',
    'woocommerce_variation_map.external_variation_id',
    'woocommerce_variation_map.external_product_id'
  ).from('product_variant');
  query
    .leftJoin('woocommerce_variation_map')
    .on('woocommerce_variation_map.product_variant_id', '=', 'product_variant.product_variant_id');
  query.where('product_variant.product_id', '=', productId);
  const rows = await query.execute(pool);

  const sources = await select('woocommerce_product_map_id')
    .from('woocommerce_product_map')
    .where('product_id', '=', productId)
    .execute(pool);
  const singleSource = sources.length <= 1;

  for (const row of rows) {
    let stale: boolean;
    if (row.external_variation_id === null) {
      stale = rows.length > 1;
    } else if (processedExternalIds.has(row.external_variation_id)) {
      stale = false;
    } else if (row.external_product_id === null) {
      stale = singleSource;
    } else {
      stale = row.external_product_id === wcProductId;
    }
    if (stale) {
      // A variant that registrations or order lines still point at is kept
      // (deleting it would only NULL their product_variant_id and lose which
      // week/variant was booked) - this includes the variants of earlier
      // seasons. It's un-flagged as default so it can't act as the product's
      // default next to the real variants.
      if (await isVariantInUse(row.product_variant_id)) {
        await update('product_variant')
          .given({ is_default: false, updated_at: new Date() })
          .where('product_variant_id', '=', row.product_variant_id)
          .execute(pool);
        continue;
      }
      // Cascades to inventory_item, variant_attribute_value, variant_lookup
      // and the woocommerce_variation_map row itself.
      await del('product_variant').where('product_variant_id', '=', row.product_variant_id).execute(pool);
    }
  }
}

async function isVariantInUse(variantId: number): Promise<boolean> {
  const registration = await select('registration_id')
    .from('registration')
    .where('product_variant_id', '=', variantId)
    .load(pool);
  if (registration) {
    return true;
  }
  const orderItem = await select('order_item_id')
    .from('order_item')
    .where('product_variant_id', '=', variantId)
    .load(pool);
  return !!orderItem;
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
  batchId: number,
  options: VariantSyncOptions = { season: null, campName: wcProduct.name }
): Promise<void> {
  let inputs: VariantImportInput[];
  if (variations.length > 0) {
    inputs = variations.map(variantInputFromVariation);
  } else {
    const simple = variantInputFromSimpleProduct(wcProduct);
    // A simple year product ("Golfsurfen 2022") is one season of the camp
    // type: give its variant a kampweek option with the camp name, so it
    // becomes "Golfsurfen 2022" and the years stay separate variants.
    if (options.season !== null) {
      simple.attributes = [{ attribute_name: 'Kampweek', option_text: options.campName }];
    }
    inputs = [simple];
  }

  const processedExternalIds = new Set<number>();
  const failures: string[] = [];

  for (const input of inputs) {
    processedExternalIds.add(input.external_variation_id);
    try {
      await syncSingleVariant(product.product_id, input, wcProduct, batchId, variations.length === 0, options);
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

  await deleteStaleVariants(product.product_id, wcProduct.id, processedExternalIds);

  // Surfacing failures here lets the caller's per-product try/catch (in
  // runImport.ts) mark the whole product as failed for this batch, the same
  // granularity used for every other import failure - while the per-variant
  // recordVariantFailed() calls above still preserve which variation(s)
  // specifically failed and why.
  if (failures.length > 0) {
    throw new Error(`Failed to sync ${failures.length} variant(s): ${failures.join('; ')}`);
  }
}
