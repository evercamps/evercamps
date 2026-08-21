import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import updateProduct from '../../services/product/updateProduct.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { ProductData } from '../../services/product/createProduct.js';

interface Params {
  category_id: string;
}

interface Body {
  product_id: string;
}

interface Category {
  category_id: number;
  uuid: string;
}

interface Product {
  product_id: number;
  category_id?: number;
  uuid: string;
}

export default async function assignProductToCategory(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const { category_id } = request.params as unknown as Params;
  const { product_id } = request.body as Body;

  try {
    // Check if the category exists
    const category = (await select()
      .from('category')
      .where('uuid', '=', category_id)
      .load(pool)) as Category | null;

    if (!category) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Category does not exist'
      });
      return;
    }

    // Check if the product exists
    const product = (await select()
      .from('product')
      .where('uuid', '=', product_id)
      .load(pool)) as Product | null;

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Product does not exist'
      });
      return;
    }

    // Check if the product is already assigned to the category
    const productCategory = await select()
      .from('product')
      .where('category_id', '=', category.category_id)
      .and('product_id', '=', product.product_id)
      .load(pool);

    if (productCategory) {
      response.status(OK);
      response.json({
        success: true,
        message: 'Product is assigned to the category'
      });
      return;
    }

    await updateProduct(
      product_id,
      {
        category_id: category.category_id
      } as unknown as ProductData,
      {
        routeId: request.currentRoute.id
      }
    );

    response.status(OK);
    response.json({
      success: true,
      data: {
        product_id: product.product_id,
        category_id: category.category_id
      }
    });
  } catch (e) {
    error(e);

    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      success: false,
      message: e instanceof Error ? e.message : String(e)
    });
  }
}