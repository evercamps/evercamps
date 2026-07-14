import { del, insert, select, update } from '@evershop/postgres-query-builder';
import { deleteProduct, pool } from '../core.js';
import type { BatchStatus, ImportBatchSummary } from '../types.js';

export async function startBatch(): Promise<number> {
  const result = await insert('woocommerce_import_batch')
    .given({ status: 'running' })
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
  batchId: number,
  externalUpdatedAt?: string
): Promise<void> {
  await update('woocommerce_product_map')
    .given({
      last_batch_id: batchId,
      status: 'success',
      error_message: null,
      external_updated_at: externalUpdatedAt ?? null,
      updated_at: new Date()
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

export async function listBatches(limit = 20): Promise<ImportBatchSummary[]> {
  const query = select().from('woocommerce_import_batch');
  query.orderBy('started_at', 'DESC').limit(0, limit);
  return query.execute(pool);
}

export async function rollbackBatch(
  uuid: string,
  context: Record<string, unknown>
): Promise<ImportBatchSummary> {
  const batch = await select()
    .from('woocommerce_import_batch')
    .where('uuid', '=', uuid)
    .load(pool);
  if (!batch) {
    throw new Error('Import batch not found.');
  }

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
  await del('woocommerce_import_batch')
    .where('woocommerce_import_batch_id', '=', batch.woocommerce_import_batch_id)
    .execute(pool);

  return batch;
}
