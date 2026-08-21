import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import updateProduct from '../../services/product/updateProduct.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function removeProductFromCategory(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const { category_id, product_id } = request.params;

  try {
    // Check if the category exists
    const category = await select()
      .from('category')
      .where('uuid', '=', category_id)
      .load(pool);

    if (!category) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Category does not exist'
      });
      return;
    }

    // Check if the product exists
    const product = await select()
      .from('product')
      .where('uuid', '=', product_id)
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Product does not exist'
      });
      return;
    }

    // Remove the product from the category
    await updateProduct(
      product_id as string,
      {
        category_id: null
      } as any,
      {
        routeId: request.currentRoute.id
      }
    );

    response.status(OK);
    response.json({
      success: true,
      data: {
        product_id,
        category_id
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      success: false,
      message: e instanceof Error ? e.message : String(e)
    });
  }
}