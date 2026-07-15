import { createProduct, debug, error, updateProduct } from '../core.js';
import {
  findMapByExternalId,
  finishBatch,
  getProductUuid,
  recordCreated,
  recordFailed,
  recordUpdated,
  startBatch
} from '../services/importBatch.js';
import { getWooCommerceSettings } from '../services/settings.js';
import type { ImportBatchSummary } from '../types.js';
import { resolveProductImages } from './importImages.js';
import { mapProduct } from './mapProduct.js';
import { createWooCommerceClient, fetchAllProducts } from './woocommerceClient.js';

export async function runImport(): Promise<ImportBatchSummary> {
  const settings = await getWooCommerceSettings();
  if (!settings.storeUrl || !settings.consumerKey || !settings.consumerSecret) {
    throw new Error(
      'WooCommerce store URL, consumer key and consumer secret must be configured before importing.'
    );
  }

  const client = createWooCommerceClient(settings);
  const batchId = await startBatch();

  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  try {
    for await (const page of fetchAllProducts(client)) {
      for (const wcProduct of page) {
        totalFetched += 1;

        let data;
        try {
          data = mapProduct(wcProduct);
        } catch (e) {
          totalFailed += 1;
          await recordFailed(batchId, wcProduct.id, (e as Error).message);
          continue;
        }

        const existing = await findMapByExternalId(wcProduct.id);

        try {
          data.images = await resolveProductImages(wcProduct.id, wcProduct.images || []);

          if (!existing || !existing.product_id) {
            debug('creating product');
            const product = await createProduct(data, { routeId: 'importProducts' });
            if(existing && !existing.product_id) {
              debug('udpating record');
              await recordUpdated(existing.woocommerce_product_map_id, product.product_id, batchId, wcProduct.date_modified);
            }
            else{
              debug('creating record');
              await recordCreated(batchId, wcProduct.id, product.product_id, wcProduct.date_modified);
            }
            totalCreated += 1;
          } else {
            const uuid = await getProductUuid(existing.product_id);
            if (!uuid) {
              throw new Error(`Local product ${existing.product_id} no longer exists.`);
            }
            debug('updating product');
            await updateProduct(uuid, data, { routeId: 'importProducts' });
            await recordUpdated(existing.woocommerce_product_map_id, existing.product_id, batchId, wcProduct.date_modified);
            totalUpdated += 1;
          }
        } catch (e) {
          
          debug('failed updating record ' + (e as Error).message + ' ' +JSON.stringify(wcProduct));
          totalFailed += 1;
          await recordFailed(
            batchId,
            wcProduct.id,
            (e as Error).message,
            existing ? existing.woocommerce_product_map_id : undefined
          );
        }
      }
    }

    const status =
      totalFailed === 0 ? 'completed' : totalCreated + totalUpdated > 0 ? 'partial' : 'failed';
    return await finishBatch(batchId, status, {
      totalFetched,
      totalCreated,
      totalUpdated,
      totalFailed
    });
  } catch (e) {
    await finishBatch(batchId, 'failed', {
      totalFetched,
      totalCreated,
      totalUpdated,
      totalFailed,
      errorMessage: (e as Error).message
    });
    throw e;
  }
}
