import { del, insertOnUpdate, select } from '@evershop/postgres-query-builder';
import { createCategory, pool } from '../core.js';
import type { WooCommerceCategory, WooCommerceProduct } from '../types.js';

async function findCategoryIdByUrlKey(urlKey: string): Promise<number | null> {
  const row = await select('category_description_category_id')
    .from('category_description')
    .where('url_key', '=', urlKey)
    .load(pool);
  return row ? row.category_description_category_id : null;
}

// Matched/created by WC category slug <-> category_description.url_key so
// re-imports resolve to the same local category instead of duplicating it.
// Flat only - no parent-category hierarchy mapping in v1.
async function findOrCreateCategory(wcCategory: WooCommerceCategory): Promise<number> {
  const existingId = await findCategoryIdByUrlKey(wcCategory.slug);
  if (existingId) {
    return existingId;
  }

  const created = await createCategory(
    {
      name: wcCategory.name,
      description: wcCategory.name,
      url_key: wcCategory.slug,
      status: 1,
      include_in_nav: 1,
      meta_title: wcCategory.name,
      meta_description: wcCategory.name
    },
    {}
  );
  return created.insertId;
}

export async function syncProductCategories(
  product: { product_id: number },
  wcProduct: WooCommerceProduct
): Promise<void> {
  const categories = wcProduct.categories || [];
  const currentCategoryIds = new Set<number>();

  for (const wcCategory of categories) {
    const categoryId = await findOrCreateCategory(wcCategory);
    currentCategoryIds.add(categoryId);
    await insertOnUpdate('product_category', ['category_id', 'product_id'])
      .given({ category_id: categoryId, product_id: product.product_id })
      .execute(pool);
  }

  const existingLinks = await select('product_category_id', 'category_id')
    .from('product_category')
    .where('product_id', '=', product.product_id)
    .execute(pool);

  for (const link of existingLinks) {
    if (!currentCategoryIds.has(link.category_id)) {
      await del('product_category').where('product_category_id', '=', link.product_category_id).execute(pool);
    }
  }
}
