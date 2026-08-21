import { execute, select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CategoryCollection } from '../../../../../modules/catalog/services/CategoryCollection.js';
import { getCategoriesBaseQuery } from '../../../../../modules/catalog/services/getCategoriesBaseQuery.js';
import { getFilterableAttributes } from '../../../../../modules/catalog/services/getFilterableAttributes.js';
import { getProductsByCategoryBaseQuery } from '../../../../../modules/catalog/services/getProductsByCategoryBaseQuery.js';
import { ProductCollection } from '../../../../../modules/catalog/services/ProductCollection.js';
import type { Pool } from 'pg';

interface Category {
  categoryId: number;
  uuid: string;
  parentId?: number | null;
  image?: string | null;
  name?: string;
  description?: string;
}

interface Product {
  categoryId?: number | null;
}

interface Context {
  pool: Pool;
  user?: unknown;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

export default {
  Query: {
    category: async (
      _: unknown,
      { id }: { id: number },
      { pool }: Context
    ) => {
      const query = select().from('category');

      query
        .leftJoin('category_description')
        .on(
          'category_description.category_description_category_id',
          '=',
          'category.category_id'
        );

      query.where('category_id', '=', id);

      const result = await query.load(pool);

      return result ? camelCase(result) : null;
    },

    categories: async (
      _: unknown,
      { filters = [] }: { filters?: Filter[] },
      { user }: Context
    ) => {
      const query = getCategoriesBaseQuery();
      const root = new CategoryCollection(query);

      await root.init(filters, !!user);

      return root;
    }
  },

  Category: {
    products: async (
      category: Category,
      { filters = [] }: { filters?: Filter[] },
      { user }: Context
    ) => {
      const query = await getProductsByCategoryBaseQuery(
        category.categoryId,
        !user
      );

      const root = new ProductCollection(query);

      await root.init(filters, !!user);

      return root;
    },

    availableAttributes: async (category: Category) =>
      getFilterableAttributes(category.categoryId),

    priceRange: async (
      category: Category,
      _: unknown,
      { pool }: Context
    ) => {
      const query = await getProductsByCategoryBaseQuery(
        category.categoryId,
        true
      );

      query
        .select('MIN(product.price)', 'min')
        .select('MAX(product.price)', 'max');

      const result = await query.load(pool);

      return {
        min: result.min || 0,
        max: result.max || 0
      };
    },

    url: async (
      category: Category,
      _: unknown,
      { pool }: Context
    ) => {
      const urlRewrite = await select()
        .from('url_rewrite')
        .where('entity_uuid', '=', category.uuid)
        .and('entity_type', '=', 'category')
        .load(pool);

      if (!urlRewrite) {
        return buildUrl('categoryView', {
          uuid: category.uuid
        });
      }

      return urlRewrite.request_path;
    },

    image: (category: Category) => {
      const { image, name } = category;

      if (!image) {
        return null;
      }

      return {
        alt: name,
        url: image
      };
    },

    children: async (
      category: Category,
      _: unknown,
      { pool }: Context
    ) => {
      const query = select().from('category');

      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );

      query.where('category.parent_id', '=', category.categoryId);

      const results = await query.execute(pool);

      return results.map((row) => camelCase(row));
    },

    path: async (
      category: Category,
      _: unknown,
      { pool }: Context
    ) => {
      const query = await execute(
        pool,
        `WITH RECURSIVE category_path AS (
          SELECT category_id, parent_id, 1 AS level
          FROM category
          WHERE category_id = ${category.categoryId}
          UNION ALL
          SELECT c.category_id, c.parent_id, cp.level + 1
          FROM category c
          INNER JOIN category_path cp ON cp.parent_id = c.category_id
        )
        SELECT category_id FROM category_path ORDER BY level DESC`
      );

      return Promise.all(
        query.rows.map(async (c) => {
          const categoryQuery = select().from('category');

          categoryQuery
            .leftJoin('category_description', 'des')
            .on(
              'des.category_description_category_id',
              '=',
              'category.category_id'
            );

          categoryQuery.where(
            'category.category_id',
            '=',
            c.category_id
          );

          return camelCase(await categoryQuery.load(pool));
        })
      );
    },

    parent: async (
      category: Category,
      _: unknown,
      { pool }: Context
    ) => {
      if (!category.parentId) {
        return null;
      }

      const query = select().from('category');

      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );

      query.where(
        'category.category_id',
        '=',
        category.parentId
      );

      return camelCase(await query.load(pool));
    },

    description: ({ description }: Category) => {
      try {
        return JSON.parse(description ?? '');
      } catch {
        const rowId = `r__${uuidv4()}`;

        return [
          {
            size: 1,
            id: rowId,
            columns: [
              {
                id: 'c__c5d90067-c786-4324-8e24-8e30520ac3d7',
                size: 1,
                data: {
                  time: 1723347125344,
                  blocks: [
                    {
                      id: 'AU89ItzUa7',
                      type: 'raw',
                      data: {
                        html: description
                      }
                    }
                  ],
                  version: '2.30.2'
                }
              }
            ]
          }
        ];
      }
    }
  },

  Product: {
    category: async (
      product: Product,
      _: unknown,
      { pool }: Context
    ) => {
      if (!product.categoryId) {
        return null;
      }

      const categoryQuery = getCategoriesBaseQuery();
      categoryQuery.where(
        'category_id',
        '=',
        product.categoryId
      );

      const category = await categoryQuery.load(pool);

      return camelCase(category);
    }
  }
};