import { insertOnUpdate, select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

interface BuildUrlRewriteData {
  product_id: number;
  uuid: string;
  category_id: number;
}

export default async function buildUrlReWrite(
  data: BuildUrlRewriteData
): Promise<void> {
  try {
    const productId = data.product_id;
    const productUuid = data.uuid;
    const categoryId = data.category_id;

    const productDescription = await select()
      .from('product_description')
      .where(
        'product_description_product_id',
        '=',
        productId
      )
      .load(pool);

    if (!productDescription) {
      return;
    }

    // Insert a new URL rewrite for the product itself
    await insertOnUpdate('url_rewrite', [
      'entity_uuid',
      'language'
    ])
      .given({
        entity_type: 'product',
        entity_uuid: productUuid,
        request_path: `/${productDescription.url_key}`,
        target_path: `/product/${productUuid}`
      })
      .execute(pool);

    // Load the category
    const category = await select()
      .from('category')
      .where('category_id', '=', categoryId)
      .load(pool);

    if (!category) {
      return;
    }

    // Get the URL rewrite for the category
    const categoryUrlRewrite = await select()
      .from('url_rewrite')
      .where(
        'entity_uuid',
        '=',
        category.uuid
      )
      .and(
        'entity_type',
        '=',
        'category'
      )
      .load(pool);

    if (!categoryUrlRewrite) {
      // Wait for the category event to be fired
      // and create the URL rewrite for the product
      return;
    }

    await insertOnUpdate('url_rewrite', [
      'entity_uuid',
      'language'
    ])
      .given({
        entity_type: 'product',
        entity_uuid: productUuid,
        request_path: `${categoryUrlRewrite.request_path}/${productDescription.url_key}`,
        target_path: `/product/${productUuid}`
      })
      .execute(pool);
  } catch (e) {
    error(e);
  }
}