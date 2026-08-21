import {
  execute,
  insertOnUpdate,
  select
} from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';

interface CategoryData {
  category_id: number;
  uuid: string;
}

interface Category {
  category_id: number;
  parent_id: number | null;
}

interface CategoryDescription {
  url_key: string;
}

export default async function buildUrlReWrite(
  data: CategoryData
): Promise<void> {
  const categoryId = data.category_id;
  const categoryUuid = data.uuid;

  // Load the category
  const category = (await select()
    .from('category')
    .where('category_id', '=', categoryId)
    .load(pool)) as Category | null;

  if (!category) {
    return;
  }

  // Load the parent categories
  const query = await execute(
    pool,
    `WITH RECURSIVE parent_categories AS (
      SELECT *
      FROM category
      WHERE category_id = ${categoryId}

      UNION

      SELECT c.*
      FROM category c
      INNER JOIN parent_categories pc
        ON c.category_id = pc.parent_id
    )
    SELECT *
    FROM parent_categories`
  );

  const parentCategories = query.rows as Category[];

  try {
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
        .load(pool)) as CategoryDescription;

      path = `/${urlKey.url_key}${path}`;
    }

    // Insert the URL rewrite rule into the url_rewrite table
    await insertOnUpdate('url_rewrite', ['entity_uuid', 'language'])
      .given({
        entity_type: 'category',
        entity_uuid: categoryUuid,
        request_path: path,
        target_path: `/category/${categoryUuid}`
      })
      .execute(pool);
  } catch (err) {
    error(err);
  }
}