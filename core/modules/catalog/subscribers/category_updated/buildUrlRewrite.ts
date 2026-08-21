import {
  execute,
  insertOnUpdate,
  select
} from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

interface BuildUrlRewriteData {
  uuid: string;
  category_id: number;
}

interface Category {
  category_id: number;
  uuid: string;
}

interface ParentCategory {
  category_id: number;
  parent_id: number | null;
}

interface CategoryUrlKey {
  url_key: string;
}

interface CurrentPath {
  request_path: string;
}

export default async function buildUrlReWrite(
  data: BuildUrlRewriteData
): Promise<void> {
  try {
    const categoryUUid = data.uuid;
    const categoryId = data.category_id;

    // Load the category
    const category = (await select()
      .from('category')
      .where('category_id', '=', categoryId)
      .load(pool)) as Category | null;

    if (!category) {
      return;
    }

    // Load the parent categories
    const parentCategoriesQuery = await execute(
      pool,
      `WITH RECURSIVE parent_categories AS (
        SELECT * FROM category WHERE category_id = ${categoryId}
        UNION
        SELECT c.* FROM category c
        INNER JOIN parent_categories pc ON c.category_id = pc.parent_id
      )
      SELECT * FROM parent_categories`
    );

    const parentCategories =
      parentCategoriesQuery.rows as ParentCategory[];

    // Build the URL rewrite based on the category path
    let path = '';

    for (let i = 0; i < parentCategories.length; i += 1) {
      const cat = parentCategories[i];

      const urlKey = (await select('url_key')
        .from('category_description')
        .where(
          'category_description_category_id',
          '=',
          cat.category_id
        )
        .load(pool)) as CategoryUrlKey;

      path = `/${urlKey.url_key}${path}`;
    }

    // Save the current path
    const currentPath = (await select('request_path')
      .from('url_rewrite')
      .where('entity_uuid', '=', categoryUUid)
      .and('entity_type', '=', 'category')
      .load(pool)) as CurrentPath | null;

    // Insert the URL rewrite rule into the url_rewrite table
    await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
      .given({
        entity_type: 'category',
        entity_uuid: categoryUUid,
        request_path: path,
        target_path: `/category/${categoryUUid}`
      })
      .execute(pool);

    // Replace the URL rewrite rule for all the subcategories and products
    if (currentPath) {
      await execute(
        pool,
        `UPDATE url_rewrite
         SET request_path = REPLACE(
           request_path,
           '${currentPath.request_path}',
           '${path}'
         )
         WHERE entity_type IN ('category', 'product')
         AND entity_uuid != '${categoryUUid}'`
      );
    }
  } catch (err) {
    error(err);
  }
}