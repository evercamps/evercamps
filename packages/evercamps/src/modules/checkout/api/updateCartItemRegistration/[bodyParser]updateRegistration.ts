import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';
import type { Request, Response, NextFunction } from 'express';

export default async (request: Request, response: Response, next: NextFunction) => {
  try {
    let { cart_id, item_id, registration_id } = request.params;

    cart_id = cart_id instanceof Array ? cart_id[0] : cart_id;
    item_id = item_id instanceof Array ? item_id[0] : item_id;
    const reg_id: number = registration_id instanceof Array ? Number(registration_id[0]) : Number(registration_id);

    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }
    const { firstName, lastName, extraData } = request.body;
    const item = await cart.updateCartItemRegistration(item_id, reg_id, {
      firstName,
      lastName,
      extraData
    });
    await saveCart(cart);
    response.status(OK);
    (response as any).$body = {
      data: {
        item: item.export(),
        count: cart.getItems().length,
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (err: any) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
