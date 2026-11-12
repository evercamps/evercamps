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
import { collectParticipantExtraData } from '../../../camp/services/participantCheckoutFields.js';
import type { Response, NextFunction } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  try {
    const cartId = request.params.cart_id;
    // product_variant_id is optional: without it the product's default variant is used.
    const { sku, qty, first_name, last_name, product_variant_id } = request.body;
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

    // Extra participant fields (birth date, national number, ...): configured
    // in Camp settings, checked for required values and validated by plugins.
    const extraData =
      first_name && last_name ? await collectParticipantExtraData(request.body) : undefined;

    const item = await cart.addItem(product.product_id, parseInt(qty, 10), {
      first_name,
      last_name,
      extraData,
      product_variant_id
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
