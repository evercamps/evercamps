import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { setContextValue } from '../../../graphql/services/contextHelper.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';
import { getSetting } from '../../../setting/services/setting.js';
import type { Response, NextFunction } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  try {
    const cartId = request.params.cart_id;
    const { sku, qty, first_name, last_name } = request.body;
    const cart = await getCartByUUID(cartId instanceof Array ? cartId[0] : cartId);

    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid cart id'
        }
      });
      return;
    }

    const product = await select()
      .from('product')
      .where('sku', '=', sku)
      .and('status', '=', 1)
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Product not found'
        }
      });
      return;
    }

    // Collect extra field values from the body and assemble extraData
    let extraData: Record<string, string> | undefined;
    if (first_name && last_name) {
      const rawExtraFields = await getSetting('participant_checkout_fields', null);
      const extraFields: { code: string }[] = (() => {
        try {
          const parsed = typeof rawExtraFields === 'string' ? JSON.parse(rawExtraFields) : rawExtraFields;
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })();
      if (extraFields.length > 0) {
        const collected = Object.fromEntries(
          extraFields
            .filter((f) => request.body[f.code] !== undefined)
            .map((f) => [f.code, request.body[f.code]])
        );
        if (Object.keys(collected).length > 0) {
          extraData = collected;
        }
      }
    }

    const item = await cart.addItem(product.product_id, parseInt(qty, 10), {
      first_name,
      last_name,
      extraData
    });
    await saveCart(cart);
    setContextValue(request, 'cartId', cart.getData('uuid'));
    response.status(OK);
    (response as any).$body = {
      data: {
        item: item.export(),
        count: cart.getData('total_qty'),
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (err: any) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
