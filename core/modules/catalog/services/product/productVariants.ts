import {
  del,
  insert,
  insertOnUpdate,
  select,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { inTransaction } from '../../../../lib/postgres/inTransaction.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { isVariantAttribute } from '../attribute/attributeRole.js';
import { buildVariantOptionHash, type VariantOptionPair } from '../variantLookup.js';

// Manage a product's variants (product_variant + inventory_item +
// variant_attribute_value + variant_lookup) from the admin "Variants" card.

export interface ProductVariantInput {
  sku?: string;
  title?: string | null;
  price?: number | string;
  // Price for a registration with a membership number (ADR-0006); empty or
  // null = no member price
  member_price?: number | string | null;
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

function toMemberPrice(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) {
    throw new Error('Member price must be empty or a number of at least 0');
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

// An option's attribute must be a variant attribute (ADR-0004) of the
// product's attribute group. An attribute the product's variants already use
// stays allowed, so existing variants can still be saved.
async function assertVariantAttributeAllowed(productId: number, attributeId: number, connection: PoolClient) {
  const attribute = await select('attribute_name', 'role')
    .from('attribute')
    .where('attribute_id', '=', attributeId)
    .load(connection, false);
  if (!attribute) {
    throw new Error('Attribute not found');
  }
  const used = await attributesUsedByVariants(productId, connection);
  if (used.some((usedAttribute) => usedAttribute.attributeId === attributeId)) {
    return;
  }
  if (!isVariantAttribute(attribute)) {
    throw new Error(`"${attribute.attribute_name}" is not a variant attribute`);
  }
  const groupQuery = select('attribute_group_link.attribute_id').from('product');
  groupQuery
    .innerJoin('attribute_group_link')
    .on('attribute_group_link.group_id', '=', 'product.group_id');
  groupQuery.where('product.product_id', '=', productId).and('attribute_group_link.attribute_id', '=', attributeId);
  if (!(await groupQuery.load(connection, false))) {
    throw new Error(`"${attribute.attribute_name}" is not in the attribute group of this product`);
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
    await assertVariantAttributeAllowed(productId, attributeId, connection);
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
        member_price: toMemberPrice(data.member_price),
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
    // Adding a variant turns a simple product into a configurable one. It
    // never switches back automatically.
    await update('product')
      .given({ type: 'configurable' })
      .where('product_id', '=', product.product_id)
      .and('type', '=', 'simple')
      .execute(connection, false);
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
    if (data.member_price !== undefined) {
      given.member_price = toMemberPrice(data.member_price);
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

export interface UsedAttribute {
  attributeId: number;
  attributeName: string;
}

/**
 * The attributes the product's variants have a value (option) for, sorted by
 * name. Non-empty means the product's attribute group is locked (ADR-0003);
 * the database enforces the same rule on product.group_id.
 */
export async function attributesUsedByVariants(
  productId: number,
  connection: PoolClient | typeof pool = pool
): Promise<UsedAttribute[]> {
  const query = select('attribute.attribute_id', 'attribute.attribute_name').from('variant_attribute_value');
  query
    .innerJoin('product_variant')
    .on('product_variant.product_variant_id', '=', 'variant_attribute_value.variant_id');
  query.innerJoin('attribute').on('attribute.attribute_id', '=', 'variant_attribute_value.attribute_id');
  query.where('product_variant.product_id', '=', productId).and('variant_attribute_value.option_id', 'IS NOT NULL', null);
  const rows = await query.execute(connection, false);
  const byId = new Map<number, UsedAttribute>();
  for (const row of rows) {
    byId.set(row.attribute_id, { attributeId: row.attribute_id, attributeName: String(row.attribute_name) });
  }
  return [...byId.values()].sort((a, b) => a.attributeName.localeCompare(b.attributeName));
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
    // A product always keeps a default variant: promote the oldest remaining
    // one when the default was deleted. The product stays configurable.
    if (variant.is_default) {
      const nextQuery = select('product_variant_id').from('product_variant');
      nextQuery.where('product_id', '=', variant.product_id);
      nextQuery.orderBy('product_variant_id', 'ASC');
      const next = await nextQuery.load(connection, false);
      if (next) {
        await setOnlyDefault(variant.product_id, next.product_variant_id, connection);
      }
    }
    return variant;
  });
}

export const createProductVariant = (productUuid: string, data: ProductVariantInput, context: Record<string, unknown> = {}) =>
  hookable(createProductVariantFunc, context)(productUuid, data);

export const updateProductVariant = (variantUuid: string, data: ProductVariantInput, context: Record<string, unknown> = {}) =>
  hookable(updateProductVariantFunc, context)(variantUuid, data);

export const deleteProductVariant = (variantUuid: string, context: Record<string, unknown> = {}) =>
  hookable(deleteProductVariantFunc, context)(variantUuid);
