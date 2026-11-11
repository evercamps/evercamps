import { update } from '@evershop/postgres-query-builder';
import { createProduct, debug, error, pool, updateProduct } from '../core.js';
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
import type { ImportBatchSummary, ProductImportData, WooCommerceProduct, WooCommerceVariation } from '../types.js';
import { findCampProduct, isNewestYear, mergeProductInto, saveCampProduct } from './campProducts.js';
import { syncProductCategories } from './importCategories.js';
import { resolveProductImages } from './importImages.js';
import { syncProductVariants } from './importVariants.js';
import { mapProduct } from './mapProduct.js';
import { campKey, parseCampProductName } from './season.js';
import { createWooCommerceClient, fetchAllProducts, fetchAllVariations } from './woocommerceClient.js';

async function updateCampProduct(
  productId: number,
  wcProduct: WooCommerceProduct,
  data: ProductImportData
): Promise<void> {
  const uuid = await getProductUuid(productId);
  if (!uuid) {
    throw new Error(`Local product ${productId} no longer exists.`);
  }
  debug('updating product');
  data.images = await resolveProductImages(wcProduct.id, wcProduct.images || []);
  await updateProduct(uuid, data, { routeId: 'importProducts' });
}

async function recordProductYear(externalProductId: number, year: number | null): Promise<void> {
  await update('woocommerce_product_map')
    .given({ external_year: year })
    .where('external_product_id', '=', externalProductId)
    .execute(pool);
}

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

        // One evercamps product per camp type: "Golfsurfen-watersporten-omnisport
        // 2022" and "... 2023" both go to "Golfsurfen-watersporten-omnisport";
        // the year ends up in the kampweek options ("Week 1 zomer 2022").
        const { baseName, year } = parseCampProductName(wcProduct.name);
        const key = campKey(baseName);

        let data;
        try {
          data = mapProduct(wcProduct);
          if (year !== null) {
            data = { ...data, name: baseName, url_key: key, sku: key };
          }
        } catch (e) {
          totalFailed += 1;
          await recordFailed(batchId, wcProduct.id, (e as Error).message);
          continue;
        }

        const existing = await findMapByExternalId(wcProduct.id);

        try {
          const camp = await findCampProduct(key);
          // Product details (description, price, images, categories) come from
          // the newest year of the camp type.
          const newest = isNewestYear(camp, year);

          let productId: number;
          if (camp) {
            productId = camp.product_id;
            // Imported earlier as its own per-year product: merge it in.
            if (existing?.product_id && existing.product_id !== productId) {
              await mergeProductInto(existing.product_id, productId);
            }
            if (newest) {
              await updateCampProduct(productId, wcProduct, data);
            }
            totalUpdated += 1;
          } else if (existing?.product_id) {
            // First WC product of this camp type, imported earlier as its own
            // product: it becomes the camp-type product (renamed to the base name).
            productId = existing.product_id;
            await updateCampProduct(productId, wcProduct, data);
            totalUpdated += 1;
          } else {
            debug('creating product');
            data.images = await resolveProductImages(wcProduct.id, wcProduct.images || []);
            const product = await createProduct(data, { routeId: 'importProducts' });
            productId = product.product_id;
            totalCreated += 1;
          }
          await saveCampProduct(key, productId, year);

          if (existing) {
            await recordUpdated(existing.woocommerce_product_map_id, productId, batchId, wcProduct.date_modified);
          } else {
            await recordCreated(batchId, wcProduct.id, productId, wcProduct.date_modified);
          }
          await recordProductYear(wcProduct.id, year);

          if (newest) {
            await syncProductCategories({ product_id: productId }, wcProduct);
          }

          const variations: WooCommerceVariation[] = [];
          if (wcProduct.type === 'variable') {
            for await (const page of fetchAllVariations(client, wcProduct.id)) {
              variations.push(...page);
            }
          }
          await syncProductVariants({ product_id: productId }, wcProduct, variations, batchId, {
            season: year,
            campName: baseName
          });
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
