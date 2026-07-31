import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import type { Pool } from 'pg';

interface Category {
  uuid: string;
}

interface Product {
  uuid: string;
  categoryId?: number | null;
}

interface Context {
  pool: Pool;
}

export default {
  Category: {
    editUrl: (category: Category) =>
      buildUrl('categoryEdit', { id: category.uuid }),

    updateApi: (category: Category) =>
      buildUrl('updateCategory', { id: category.uuid }),

    deleteApi: (category: Category) =>
      buildUrl('deleteCategory', { id: category.uuid }),

    addProductUrl: (category: Category) =>
      buildUrl('addProductToCategory', {
        category_id: category.uuid
      })
  },

  Product: {
    removeFromCategoryUrl: async (
      product: Product,
      _: unknown,
      { pool }: Context
    ) => {
      if (!product.categoryId) {
        return null;
      }

      const category = await select()
        .from('category')
        .where('category_id', '=', product.categoryId)
        .load(pool);

      if (!category) {
        return null;
      }

      return buildUrl('removeProductFromCategory', {
        category_id: category.uuid,
        product_id: product.uuid
      });
    }
  }
};