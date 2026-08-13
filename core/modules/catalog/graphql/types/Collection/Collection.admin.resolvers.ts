import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import type { Pool } from 'pg';

interface Collection {
  uuid: string;
}

interface Product {
  uuid: string;
  collectionId?: number | null;
}

interface Context {
  pool: Pool;
}

export default {
  Collection: {
    editUrl: (collection: Collection) =>
      buildUrl('collectionEdit', { id: collection.uuid }),

    addProductUrl: (collection: Collection) =>
      buildUrl('addProductToCollection', {
        collection_id: collection.uuid
      }),

    updateApi: (collection: Collection) =>
      buildUrl('updateCollection', { id: collection.uuid }),

    deleteApi: (collection: Collection) =>
      buildUrl('deleteCollection', { id: collection.uuid })
  },

  Product: {
    removeFromCollectionUrl: async (
      product: Product,
      _: unknown,
      { pool }: Context
    ) => {
      if (!product.collectionId) {
        return null;
      }

      const collection = await select()
        .from('collection')
        .where('collection_id', '=', product.collectionId)
        .load(pool);

      if (!collection) {
        return null;
      }

      return buildUrl('removeProductFromCollection', {
        collection_id: collection.uuid,
        product_id: product.uuid
      });
    }
  }
};