import {
  commit,
  del,
  insert,
  insertOnUpdate,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { buildVariantOptionHash, type VariantOptionPair } from '../variantLookup.js';

// Manage a product's variants (product_variant + inventory_item +
// variant_attribute_value + variant_lookup) from the admin "Variants" card.

export interface ProductVariantInput {
  sku?: string;
  title?: string | null;
  price?: number | string;
  total_seats?: number | string;
  is_default?: boolean | string | number;
  // false = disabled: kept (with its registrations) but not bookable in the shop
  status?: boolean | string | number;
  // One option per attribute, e.g. kampweek "Week 1 zomer 2027". Replaces the
  // variant's current options when given.
  options?: { attribute_id: number | string; option_id: number | string }[];
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toInt(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be a whole number`);
  }
  return number;
}

function toPrice(value: unknown): number {
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) {
    throw new Error('Price must be a number of at least 0');
  }
  return number;
}

async function loadProduct(productUuid: string, connection: PoolClient) {
  const product = await select('product_id')
    .from('product')
    .where('uuid', '=', productUuid)
    .load(connection, false);
  if (!product) {
    throw new Error('Product not found');
  }
  return product;
}

async function loadVariant(variantUuid: string, connection: PoolClient) {
  const variant = await select()
    .from('product_variant')
    .where('uuid', '=', variantUuid)
    .load(connection, false);
  if (!variant) {
    throw new Error('Variant not found');
  }
  return variant;
}

async function assertSkuFree(sku: string, connection: PoolClient, exceptVariantId?: number) {
  const query = select('product_variant_id').from('product_variant').where('sku', '=', sku);
  if (exceptVariantId) {
    query.and('product_variant_id', '!=', exceptVariantId);
  }
  if (await query.load(connection, false)) {
    throw new Error(`SKU "${sku}" is already used by another variant`);
  }
}

// Validates the options (each option belongs to its attribute, one option per
// attribute) and writes them + the lookup hash. The hash is unique per
// product, so two variants can't have the same option combination.
async function writeOptions(
  productId: number,
  variantId: number,
  options: NonNullable<ProductVariantInput['options']>,
  connection: PoolClient
) {
  const pairs: VariantOptionPair[] = [];
  const seenAttributes = new Set<number>();
  for (const option of options) {
    const attributeId = toInt(option.attribute_id, 'Attribute');
    const optionId = toInt(option.option_id, 'Option');
    if (seenAttributes.has(attributeId)) {
      throw new Error('A variant can have only one option per attribute');
    }
    seenAttributes.add(attributeId);
    const exists = await select('attribute_option_id')
      .from('attribute_option')
      .where('attribute_option_id', '=', optionId)
      .and('attribute_id', '=', attributeId)
      .load(connection, false);
    if (!exists) {
      throw new Error('Option does not belong to the attribute');
    }
    pairs.push({ attributeId, optionId });
  }

  const optionHash = buildVariantOptionHash(pairs);
  const duplicate = await select('variant_id')
    .from('variant_lookup')
    .where('product_id', '=', productId)
    .and('option_hash', '=', optionHash)
    .and('variant_id', '!=', variantId)
    .load(connection, false);
  if (duplicate) {
    throw new Error('Another variant of this product already has these options');
  }

  await del('variant_attribute_value').where('variant_id', '=', variantId).execute(connection, false);
  for (const pair of pairs) {
    await insert('variant_attribute_value')
      .given({ variant_id: variantId, attribute_id: pair.attributeId, option_id: pair.optionId })
      .execute(connection, false);
  }
  await del('variant_lookup').where('variant_id', '=', variantId).execute(connection, false);
  await insert('variant_lookup')
    .given({ product_id: productId, variant_id: variantId, option_hash: optionHash })
    .execute(connection, false);
}

async function setOnlyDefault(productId: number, variantId: number, connection: PoolClient) {
  await update('product_variant')
    .given({ is_default: false })
    .where('product_id', '=', productId)
    .and('product_variant_id', '!=', variantId)
    .execute(connection, false);
  await update('product_variant')
    .given({ is_default: true })
    .where('product_variant_id', '=', variantId)
    .execute(connection, false);
}

async function inTransaction<T>(work: (connection: PoolClient) => Promise<T>): Promise<T> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const result = await work(connection);
    await commit(connection);
    return result;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

async function createProductVariantFunc(productUuid: string, data: ProductVariantInput) {
  return inTransaction(async (connection) => {
    const product = await loadProduct(productUuid, connection);
    const sku = String(data.sku ?? '').trim();
    if (!sku) {
      throw new Error('SKU is required');
    }
    await assertSkuFree(sku, connection);

    const variant = await insert('product_variant')
      .given({
        product_id: product.product_id,
        sku,
        price: toPrice(data.price ?? 0),
        title: data.title ? String(data.title).trim() : null,
        is_default: false,
        status: data.status === undefined ? true : toBool(data.status)
      })
      .execute(connection, false);
    const variantId = variant.insertId;

    await insert('inventory_item')
      .given({ variant_id: variantId, total_seats: toInt(data.total_seats ?? 0, 'Seats') })
      .execute(connection, false);
    await writeOptions(product.product_id, variantId, data.options ?? [], connection);
    if (toBool(data.is_default)) {
      await setOnlyDefault(product.product_id, variantId, connection);
    }
    return select().from('product_variant').where('product_variant_id', '=', variantId).load(connection, false);
  });
}

async function updateProductVariantFunc(variantUuid: string, data: ProductVariantInput) {
  return inTransaction(async (connection) => {
    const variant = await loadVariant(variantUuid, connection);
    const given: Record<string, unknown> = {};
    if (data.sku !== undefined) {
      const sku = String(data.sku).trim();
      if (!sku) {
        throw new Error('SKU is required');
      }
      await assertSkuFree(sku, connection, variant.product_variant_id);
      given.sku = sku;
    }
    if (data.title !== undefined) {
      given.title = data.title ? String(data.title).trim() : null;
    }
    if (data.price !== undefined) {
      given.price = toPrice(data.price);
    }
    if (data.status !== undefined) {
      given.status = toBool(data.status);
    }
    if (Object.keys(given).length > 0) {
      given.updated_at = new Date();
      await update('product_variant')
        .given(given)
        .where('product_variant_id', '=', variant.product_variant_id)
        .execute(connection, false);
    }
    if (data.total_seats !== undefined) {
      await insertOnUpdate('inventory_item', ['variant_id'])
        .given({ variant_id: variant.product_variant_id, total_seats: toInt(data.total_seats, 'Seats') })
        .execute(connection, false);
    }
    if (data.options !== undefined) {
      await writeOptions(variant.product_id, variant.product_variant_id, data.options, connection);
    }
    if (data.is_default !== undefined) {
      if (toBool(data.is_default)) {
        await setOnlyDefault(variant.product_id, variant.product_variant_id, connection);
      } else {
        await update('product_variant')
          .given({ is_default: false })
          .where('product_variant_id', '=', variant.product_variant_id)
          .execute(connection, false);
      }
    }
    return select().from('product_variant').where('product_variant_id', '=', variant.product_variant_id).load(connection, false);
  });
}

/**
 * Number of registrations and order lines that point at a variant. A variant
 * in use can't be deleted (it would lose which week/variant was booked).
 */
export async function countVariantUsage(variantId: number): Promise<number> {
  const registrations = await select()
    .from('registration')
    .select('COUNT(registration_id)', 'total')
    .where('product_variant_id', '=', variantId)
    .load(pool);
  const orderItems = await select()
    .from('order_item')
    .select('COUNT(order_item_id)', 'total')
    .where('product_variant_id', '=', variantId)
    .load(pool);
  return parseInt(registrations?.total ?? 0, 10) + parseInt(orderItems?.total ?? 0, 10);
}

async function deleteProductVariantFunc(variantUuid: string) {
  return inTransaction(async (connection) => {
    const variant = await loadVariant(variantUuid, connection);
    if ((await countVariantUsage(variant.product_variant_id)) > 0) {
      throw new Error('This variant has registrations or orders and can not be deleted');
    }
    const count = await select()
      .from('product_variant')
      .select('COUNT(product_variant_id)', 'total')
      .where('product_id', '=', variant.product_id)
      .load(connection, false);
    if (parseInt(count?.total ?? 0, 10) <= 1) {
      throw new Error('A product needs at least one variant');
    }
    // Cascades to inventory_item, variant_attribute_value and variant_lookup.
    await del('product_variant')
      .where('product_variant_id', '=', variant.product_variant_id)
      .execute(connection, false);
    return variant;
  });
}

export const createProductVariant = (productUuid: string, data: ProductVariantInput, context: Record<string, unknown> = {}) =>
  hookable(createProductVariantFunc, context)(productUuid, data);

export const updateProductVariant = (variantUuid: string, data: ProductVariantInput, context: Record<string, unknown> = {}) =>
  hookable(updateProductVariantFunc, context)(variantUuid, data);

export const deleteProductVariant = (variantUuid: string, context: Record<string, unknown> = {}) =>
  hookable(deleteProductVariantFunc, context)(variantUuid);
