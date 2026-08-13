import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Collection {
  collection_id: number;
  uuid: string;
}

interface Product {
  product_id: number;
  uuid: string;
  variant_group_id?: number | null;
}

export default async function removeProductFromCollection(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const { collection_id, product_id } = request.params;

  const connection = await getConnection();
  await startTransaction(connection);

  try {
    // Check if the collection exists
    const collection = (await select()
      .from('collection')
      .where('uuid', '=', collection_id)
      .load(connection)) as Collection | null;

    if (!collection) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Collection does not exist'
      });
      return;
    }

    // Check if the product exists
    const product = (await select()
      .from('product')
      .where('uuid', '=', product_id)
      .load(connection)) as Product | null;

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Product does not exist'
      });
      return;
    }

    if (product.variant_group_id) {
      const variants = (await select()
        .from('product')
        .where('variant_group_id', '=', product.variant_group_id)
        .execute(connection)) as Product[];

      await Promise.all(
        variants.map(async (variant) => {
          await del('product_collection')
            .where(
              'collection_id',
              '=',
              collection.collection_id
            )
            .and('product_id', '=', variant.product_id)
            .execute(connection);
        })
      );
    } else {
      await del('product_collection')
        .where('collection_id', '=', collection.collection_id)
        .and('product_id', '=', product.product_id)
        .execute(connection);
    }

    await commit(connection);

    response.status(OK);
    response.json({
      success: true,
      data: {
        product_id,
        collection_id
      }
    });
  } catch (e) {
    await rollback(connection);

    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      success: false,
      message: e instanceof Error ? e.message : String(e)
    });
  }
}