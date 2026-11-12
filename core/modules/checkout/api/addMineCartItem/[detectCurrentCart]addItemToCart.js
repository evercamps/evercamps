import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import {
  getContextValue,
  setContextValue
} from '../../../graphql/services/contextHelper.js';
import { createNewCart } from '../../services/createNewCart.js';
import { getCartByUUID } from '../../services/getCartByUUID.js';
import { saveCart } from '../../services/saveCart.js';
import { collectParticipantExtraData } from '../../../camp/services/participantCheckoutFields.js';

export default async (request, response, next) => {
  try {
    let cartId = getContextValue(request, 'cartId');
    let cart;
    if (!cartId) {
      // Create a new cart
      const { sessionID, customer } = request.locals;
      cart = await createNewCart(sessionID, customer || {});
      cartId = cart.getData('uuid');
    } else {
      cart = await getCartByUUID(cartId); // Cart object
    }
    // product_variant_id is optional: without it the product's default variant is used.
    const { sku, qty, first_name, last_name, product_variant_id } = request.body;

    // Load the product by sku
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
          message: translate('Product not found')
        }
      });
      return;
    }

    if (product.manageRegistrations === 1) {
    if (!first_name || !last_name) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: translate('First name and last name are required')
        }
      });
      return;
    }
  }

    // Extra participant fields (birth date, national number, ...): configured
    // in Camp settings, checked for required values and validated by plugins.
    // (The product page posts them, but this handler used to drop them.)
    const extraData =
      first_name && last_name ? await collectParticipantExtraData(request.body) : undefined;

    // If everything is fine, add the product to the cart
    const item = await cart.addItem(product.product_id, parseInt(qty, 10), {
      request,
      first_name,
      last_name,
      extraData,
      product_variant_id
    });
    await saveCart(cart);
    // Set the new cart id to the context, so next middleware can use it
    setContextValue(request, 'cartId', cart.getData('uuid'));
    response.status(OK);
    response.$body = {
      data: {
        item: item.export(),
        count: cart.getData('total_qty'),
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        // (was `error.message` - the logger function - so the reason was lost)
        message: e.message
      }
    });
  }
};
