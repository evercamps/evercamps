import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import { getValue } from '../../../../lib/util/registry.js';
import type { ProductFamilyData } from '../../../../../includes/types/productFamily.js';

// Content-only fields a family can update after creation. attribute_codes /
// attribute_group_id are fixed at creation time — changing them is a re-link
// operation, not a content edit, and isn't supported here.
const UPDATABLE_FIELDS = [
  'name',
  'url_key',
  'description',
  'short_description',
  'meta_title',
  'meta_description',
  'meta_keywords',
  'default_variant_id'
];

async function checkUrlKeyIsUnique(
  urlKey: string | undefined,
  familyId: number,
  connection: PoolClient
) {
  if (!urlKey) {
    return;
  }
  const existingFamily = await select()
    .from('variant_group')
    .where('url_key', '=', urlKey)
    .and('variant_group_id', '<>', familyId)
    .load(connection);
  if (existingFamily) {
    throw new Error(`Url key "${urlKey}" already exists`);
  }
  const existingProduct = await select()
    .from('product_description')
    .where('url_key', '=', urlKey)
    .load(connection);
  if (existingProduct) {
    throw new Error(`Url key "${urlKey}" already exists`);
  }
}

async function checkDefaultVariantBelongsToFamily(
  defaultVariantId: number | undefined,
  familyId: number,
  connection: PoolClient
) {
  if (!defaultVariantId) {
    return;
  }
  const product = await select()
    .from('product')
    .where('product_id', '=', defaultVariantId)
    .load(connection);
  if (!product || product.variant_group_id !== familyId) {
    throw new Error('default_variant_id must reference a product already linked to this family');
  }
}

async function updateProductFamilyData(
  uuid: string,
  data: Partial<ProductFamilyData>,
  connection: PoolClient
) {
  const family = await select()
    .from('variant_group')
    .where('uuid', '=', uuid)
    .load(connection);
  if (!family) {
    throw new Error('Requested product family not found');
  }

  const updateData: Record<string, any> = {};
  UPDATABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });

  await checkUrlKeyIsUnique(updateData.url_key, family.variant_group_id, connection);
  await checkDefaultVariantBelongsToFamily(
    updateData.default_variant_id,
    family.variant_group_id,
    connection
  );

  if (Object.keys(updateData).length === 0) {
    return family;
  }

  await update('variant_group')
    .given(updateData)
    .where('variant_group_id', '=', family.variant_group_id)
    .execute(connection);

  return select()
    .from('variant_group')
    .where('variant_group_id', '=', family.variant_group_id)
    .load(connection);
}

async function updateProductFamily(
  uuid: string,
  data: Partial<ProductFamilyData>,
  context: Record<string, any>
) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const familyData = await getValue('productFamilyDataBeforeUpdate', data);
    const family = await hookable(updateProductFamilyData, {
      ...context,
      connection
    })(uuid, familyData, connection);

    await commit(connection);
    return family;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (
  uuid: string,
  data: Partial<ProductFamilyData>,
  context: Record<string, any>
) => {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const family = await hookable(updateProductFamily, context)(uuid, data, context);
  return family;
};
