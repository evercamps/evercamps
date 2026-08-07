import { del, insert, select, update } from '@evershop/postgres-query-builder';
import { deleteProduct, pool } from '../core.js';
import type { BatchStatus, BatchType, ImportBatchSummary } from '../types.js';

export async function startBatch(type: BatchType = 'products'): Promise<number> {
  const result = await insert('woocommerce_import_batch')
    .given({ status: 'running', type })
    .execute(pool);
  return result.insertId;
}

export async function finishBatch(
  batchId: number,
  status: BatchStatus,
  counts: {
    totalFetched: number;
    totalCreated: number;
    totalUpdated: number;
    totalFailed: number;
    errorMessage?: string;
  }
): Promise<ImportBatchSummary> {
  await update('woocommerce_import_batch')
    .given({
      status,
      total_fetched: counts.totalFetched,
      total_created: counts.totalCreated,
      total_updated: counts.totalUpdated,
      total_failed: counts.totalFailed,
      error_message: counts.errorMessage ?? null,
      finished_at: new Date()
    })
    .where('woocommerce_import_batch_id', '=', batchId)
    .execute(pool);

  return select()
    .from('woocommerce_import_batch')
    .where('woocommerce_import_batch_id', '=', batchId)
    .load(pool);
}

export async function findMapByExternalId(externalId: number) {
  return select()
    .from('woocommerce_product_map')
    .where('external_product_id', '=', externalId)
    .load(pool);
}

export async function getProductUuid(productId: number): Promise<string | null> {
  const product = await select('uuid')
    .from('product')
    .where('product_id', '=', productId)
    .load(pool);
  return product ? product.uuid : null;
}

export async function recordCreated(
  batchId: number,
  externalId: number,
  productId: number,
  externalUpdatedAt?: string
): Promise<void> {
  await insert('woocommerce_product_map')
    .given({
      external_product_id: externalId,
      product_id: productId,
      created_in_batch_id: batchId,
      last_batch_id: batchId,
      status: 'success',
      error_message: null,
      external_updated_at: externalUpdatedAt ?? null
    })
    .execute(pool);
}

export async function recordUpdated(
  mapId: number,
  productId: number,
  batchId: number,
  externalUpdatedAt?: string
): Promise<void> {
  await update('woocommerce_product_map')
    .given({
      last_batch_id: batchId,
      status: 'success',
      error_message: null,
      external_updated_at: externalUpdatedAt ?? null,
      updated_at: new Date(),
      product_id: productId
    })
    .where('woocommerce_product_map_id', '=', mapId)
    .execute(pool);
}

export async function recordFailed(
  batchId: number,
  externalId: number,
  errorMessage: string,
  existingMapId?: number
): Promise<void> {
  if (existingMapId) {
    await update('woocommerce_product_map')
      .given({
        last_batch_id: batchId,
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date()
      })
      .where('woocommerce_product_map_id', '=', existingMapId)
      .execute(pool);
  } else {
    await insert('woocommerce_product_map')
      .given({
        external_product_id: externalId,
        product_id: null,
        created_in_batch_id: batchId,
        last_batch_id: batchId,
        status: 'failed',
        error_message: errorMessage
      })
      .execute(pool);
  }
}

export async function findVariationMapByExternalId(externalVariationId: number) {
  return select()
    .from('woocommerce_variation_map')
    .where('external_variation_id', '=', externalVariationId)
    .load(pool);
}

// Any variation already imported for this WC parent tells us the family's
// variant_group_id - reused so re-running an import doesn't create a second
// family for the same WooCommerce parent product.
export async function findVariantGroupIdForParent(
  externalParentProductId: number
): Promise<number | null> {
  const row = await select('variant_group_id')
    .from('woocommerce_variation_map')
    .where('external_parent_product_id', '=', externalParentProductId)
    .and('variant_group_id', 'IS NOT', null)
    .load(pool);
  return row ? row.variant_group_id : null;
}

export async function recordVariationCreated(
  batchId: number,
  externalParentProductId: number,
  externalVariationId: number,
  productId: number,
  variantGroupId: number,
  externalUpdatedAt?: string
): Promise<void> {
  await insert('woocommerce_variation_map')
    .given({
      external_parent_product_id: externalParentProductId,
      external_variation_id: externalVariationId,
      product_id: productId,
      variant_group_id: variantGroupId,
      created_in_batch_id: batchId,
      last_batch_id: batchId,
      status: 'success',
      error_message: null,
      external_updated_at: externalUpdatedAt ?? null
    })
    .execute(pool);
}

export async function recordVariationUpdated(
  mapId: number,
  productId: number,
  variantGroupId: number,
  batchId: number,
  externalUpdatedAt?: string
): Promise<void> {
  await update('woocommerce_variation_map')
    .given({
      last_batch_id: batchId,
      status: 'success',
      error_message: null,
      external_updated_at: externalUpdatedAt ?? null,
      updated_at: new Date(),
      product_id: productId,
      variant_group_id: variantGroupId
    })
    .where('woocommerce_variation_map_id', '=', mapId)
    .execute(pool);
}

export async function recordVariationFailed(
  batchId: number,
  externalParentProductId: number,
  externalVariationId: number,
  errorMessage: string,
  existingMapId?: number
): Promise<void> {
  if (existingMapId) {
    await update('woocommerce_variation_map')
      .given({
        last_batch_id: batchId,
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date()
      })
      .where('woocommerce_variation_map_id', '=', existingMapId)
      .execute(pool);
  } else {
    await insert('woocommerce_variation_map')
      .given({
        external_parent_product_id: externalParentProductId,
        external_variation_id: externalVariationId,
        product_id: null,
        variant_group_id: null,
        created_in_batch_id: batchId,
        last_batch_id: batchId,
        status: 'failed',
        error_message: errorMessage
      })
      .execute(pool);
  }
}

export async function listBatches(limit = 20): Promise<ImportBatchSummary[]> {
  const query = select().from('woocommerce_import_batch');
  query.orderBy('started_at', 'DESC').limit(0, limit);
  return query.execute(pool);
}

export interface FailedProductRow {
  external_product_id: number;
  error_message: string | null;
}

export interface FailedOrderRow {
  external_order_id: number;
  error_message: string | null;
}

async function loadBatch(batchUuid: string): Promise<ImportBatchSummary> {
  const batch = await select()
    .from('woocommerce_import_batch')
    .where('uuid', '=', batchUuid)
    .load(pool);
  if (!batch) {
    throw new Error('Import batch not found.');
  }
  return batch;
}

async function listFailedProductRows(batch: ImportBatchSummary): Promise<FailedProductRow[]> {
  return select('external_product_id', 'error_message')
    .from('woocommerce_product_map')
    .where('last_batch_id', '=', batch.woocommerce_import_batch_id)
    .and('status', '=', 'failed')
    .execute(pool);
}

async function listFailedOrderRows(batch: ImportBatchSummary): Promise<FailedOrderRow[]> {
  return select('external_order_id', 'error_message')
    .from('woocommerce_order_map')
    .where('last_batch_id', '=', batch.woocommerce_import_batch_id)
    .and('status', '=', 'failed')
    .execute(pool);
}

export async function listFailedRows(
  batchUuid: string
): Promise<(FailedProductRow | FailedOrderRow)[]> {
  const batch = await loadBatch(batchUuid);
  return batch.type === 'orders' ? listFailedOrderRows(batch) : listFailedProductRows(batch);
}

async function rollbackProductBatch(
  batch: ImportBatchSummary,
  context: Record<string, unknown>
): Promise<void> {
  const rows = await select()
    .from('woocommerce_product_map')
    .where('created_in_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);

  for (const row of rows) {
    if (row.product_id) {
      const product = await select('uuid')
        .from('product')
        .where('product_id', '=', row.product_id)
        .load(pool);
      if (product) {
        await deleteProduct(product.uuid, context);
      }
    }
  }

  await del('woocommerce_product_map')
    .where('created_in_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);

  // Variation products created by this batch - the family (variant_group)
  // row itself is left in place, since it may be reused by a future import
  // run and attribute/attribute_group rows may be shared across families.
  const variationRows = await select()
    .from('woocommerce_variation_map')
    .where('created_in_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);

  for (const row of variationRows) {
    if (row.product_id) {
      const product = await select('uuid')
        .from('product')
        .where('product_id', '=', row.product_id)
        .load(pool);
      if (product) {
        await deleteProduct(product.uuid, context);
      }
    }
  }

  await del('woocommerce_variation_map')
    .where('created_in_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);
}

async function rollbackOrderBatch(batch: ImportBatchSummary): Promise<void> {
  const rows = await select()
    .from('woocommerce_order_map')
    .where('created_in_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);

  for (const row of rows) {
    if (row.order_id) {
      // order_item/order_activity/payment_transaction/shipment cascade off
      // "order" - order_address and cart rows don't, so they're cleaned up
      // explicitly using the ids recorded on the map row at import time.
      await del('order').where('order_id', '=', row.order_id).execute(pool);
    }
    if (row.billing_address_id) {
      await del('order_address')
        .where('order_address_id', '=', row.billing_address_id)
        .execute(pool);
    }
    if (row.shipping_address_id && row.shipping_address_id !== row.billing_address_id) {
      await del('order_address')
        .where('order_address_id', '=', row.shipping_address_id)
        .execute(pool);
    }
    if (row.cart_id) {
      await del('cart').where('cart_id', '=', row.cart_id).execute(pool);
    }
  }

  await del('woocommerce_order_map')
    .where('created_in_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);
}

export async function rollbackBatch(
  uuid: string,
  context: Record<string, unknown>
): Promise<ImportBatchSummary> {
  const batch = await loadBatch(uuid);

  if (batch.type === 'orders') {
    await rollbackOrderBatch(batch);
  } else {
    await rollbackProductBatch(batch, context);
  }

  await del('woocommerce_import_batch')
    .where('woocommerce_import_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);

  return batch;
}

export async function findOrderMapByExternalId(externalId: number) {
  return select()
    .from('woocommerce_order_map')
    .where('external_order_id', '=', externalId)
    .load(pool);
}

export async function recordOrderCreated(
  batchId: number,
  externalId: number,
  orderId: number,
  billingAddressId: number | null,
  shippingAddressId: number | null,
  externalUpdatedAt?: string,
  existingMapId?: number
): Promise<void> {
  const data = {
    order_id: orderId,
    cart_id: null,
    billing_address_id: billingAddressId,
    shipping_address_id: shippingAddressId,
    last_batch_id: batchId,
    status: 'success',
    error_message: null,
    external_updated_at: externalUpdatedAt ?? null
  };

  // A map row can already exist with order_id = null when a previous run
  // failed to create this order - update that row in place instead of
  // inserting a second one, since external_order_id is unique.
  if (existingMapId) {
    await update('woocommerce_order_map')
      .given({ ...data, updated_at: new Date() })
      .where('woocommerce_order_map_id', '=', existingMapId)
      .execute(pool);
  } else {
    await insert('woocommerce_order_map')
      .given({ ...data, external_order_id: externalId, created_in_batch_id: batchId })
      .execute(pool);
  }
}

export async function recordOrderUpdated(
  mapId: number,
  batchId: number,
  externalUpdatedAt?: string
): Promise<void> {
  await update('woocommerce_order_map')
    .given({
      last_batch_id: batchId,
      status: 'success',
      error_message: null,
      external_updated_at: externalUpdatedAt ?? null,
      updated_at: new Date()
    })
    .where('woocommerce_order_map_id', '=', mapId)
    .execute(pool);
}

export async function recordOrderFailed(
  batchId: number,
  externalId: number,
  errorMessage: string,
  existingMapId?: number
): Promise<void> {
  if (existingMapId) {
    await update('woocommerce_order_map')
      .given({
        last_batch_id: batchId,
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date()
      })
      .where('woocommerce_order_map_id', '=', existingMapId)
      .execute(pool);
  } else {
    await insert('woocommerce_order_map')
      .given({
        external_order_id: externalId,
        order_id: null,
        created_in_batch_id: batchId,
        last_batch_id: batchId,
        status: 'failed',
        error_message: errorMessage
      })
      .execute(pool);
  }
}
