import { select } from '@evershop/postgres-query-builder';
import { addProductToFamily, createProduct, createProductFamily, pool, updateProduct } from '../core.js';
import {
  findVariantGroupIdForParent,
  findVariationMapByExternalId,
  recordVariationCreated,
  recordVariationFailed,
  recordVariationUpdated
} from '../services/importBatch.js';
import type { WooCommerceProduct, WooCommerceProductVariation } from '../types.js';
import { resolveVariationAttributeContext } from './importAttributes.js';
import type { VariationAttributeContext } from './importAttributes.js';
import { resolveProductImages } from './importImages.js';
import { mapVariation } from './mapVariation.js';
import { fetchProductVariations } from './woocommerceClient.js';
import type { AxiosInstance } from 'axios';
import { debug, error } from '../core.js';

export interface VariationImportSummary {
  created: number;
  updated: number;
  failed: number;
}

async function resolveFamily(
  wcProduct: WooCommerceProduct,
  attributeContext: VariationAttributeContext
) {
  const existingVariantGroupId = await findVariantGroupIdForParent(wcProduct.id);
  if (existingVariantGroupId) {
    return select()
      .from('variant_group')
      .where('variant_group_id', '=', existingVariantGroupId)
      .load(pool);
  }

  return createProductFamily(
    {
      attribute_group_id: attributeContext.attributeGroupId,
      attribute_codes: attributeContext.attributeCodes,
      name: wcProduct.name,
      url_key: wcProduct.slug,
      description: wcProduct.description || ''
    },
    { routeId: 'wc-import' }
  );
}

async function importVariation(
  wcProduct: WooCommerceProduct,
  wcVariation: WooCommerceProductVariation,
  attributeContext: VariationAttributeContext,
  family: { uuid: string; variant_group_id: number },
  parentImages: string[],
  batchId: number,
  summary: VariationImportSummary
): Promise<void> {
  let data;
  try {
    data = mapVariation(wcProduct, wcVariation, attributeContext);
  } catch (e) {
    summary.failed += 1;
    await recordVariationFailed(batchId, wcProduct.id, wcVariation.id, (e as Error).message);
    return;
  }

  const existing = await findVariationMapByExternalId(wcVariation.id);

  try {
    const ownImages = await resolveProductImages(
      wcVariation.id,
      wcVariation.image ? [wcVariation.image] : []
    );
    data.images = ownImages.length > 0 ? ownImages : parentImages;

    if (!existing || !existing.product_id) {
      const product = await createProduct(data, { routeId: 'wc-import' });
      await addProductToFamily(family.uuid, product.uuid, { routeId: 'wc-import' });

      if (existing && !existing.product_id) {
        await recordVariationUpdated(
          existing.woocommerce_variation_map_id,
          product.product_id,
          family.variant_group_id,
          batchId,
          wcVariation.date_modified
        );
      } else {
        await recordVariationCreated(
          batchId,
          wcProduct.id,
          wcVariation.id,
          product.product_id,
          family.variant_group_id,
          wcVariation.date_modified
        );
      }
      summary.created += 1;
    } else {
      const productRow = await select('uuid')
        .from('product')
        .where('product_id', '=', existing.product_id)
        .load(pool);
      if (!productRow) {
        throw new Error(`Local product ${existing.product_id} no longer exists.`);
      }
      await updateProduct(productRow.uuid, data, { routeId: 'wc-import' });
      // Re-assert the family link on every update - cheap and keeps a
      // previously-unlinked-by-hand variant back in sync.
      await addProductToFamily(family.uuid, productRow.uuid, { routeId: 'wc-import' });
      await recordVariationUpdated(
        existing.woocommerce_variation_map_id,
        existing.product_id,
        family.variant_group_id,
        batchId,
        wcVariation.date_modified
      );
      summary.updated += 1;
    }
  } catch (e) {
    summary.failed += 1;
    await recordVariationFailed(
      batchId,
      wcProduct.id,
      wcVariation.id,
      (e as Error).message,
      existing ? existing.woocommerce_variation_map_id : undefined
    );
  }
}

// Returns null when this product can't/shouldn't be imported as a variation
// family (no variation-defining attributes, or WooCommerce reports it as
// `variable` but actually has zero variations) - the caller (runImport.ts)
// falls back to importing it as a plain simple product in that case, so
// nothing is silently dropped.
export async function importVariationsForProduct(
  client: AxiosInstance,
  wcProduct: WooCommerceProduct,
  batchId: number
): Promise<VariationImportSummary | null> {
  debug("into imlport variations for product");
  const attributeContext = await resolveVariationAttributeContext(wcProduct);
  if (!attributeContext) {
    return null;
  }

  const generator = fetchProductVariations(client, wcProduct.id);
  const first = await generator.next();
  if (first.done) {
    return null;
  }

  const summary: VariationImportSummary = { created: 0, updated: 0, failed: 0 };
  const family = await resolveFamily(wcProduct, attributeContext);
  const parentImages = await resolveProductImages(wcProduct.id, wcProduct.images || []);

  for (const wcVariation of first.value) {
    await importVariation(wcProduct, wcVariation, attributeContext, family, parentImages, batchId, summary);
  }
  for await (const page of generator) {
    for (const wcVariation of page) {
      await importVariation(wcProduct, wcVariation, attributeContext, family, parentImages, batchId, summary);
    }
  }

  return summary;
}
