import { select } from '@evershop/postgres-query-builder';
import createMollieClient from '@mollie/api-client';
import smallestUnit from 'zero-decimal-currencies';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getSetting } from '../../../setting/services/setting.js';

export default async (request, response, next) => {
  const { cart_id, order_id } = request.body;
  // Check the cart
  const cart = await select()
    .from('cart')
    .where('uuid', '=', cart_id)
    .load(pool);

  if (!cart) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid cart'
      }
    });
  } else {
    const mollieConfig = getConfig('system.mollie', {});
    let apiKey;

    if (mollieConfig.apiKey) {
      apiKey = mollieConfig.apiKey;
    } else {
      apiKey = await getSetting('mollieApiKey', '');
    }
    const molliePaymentMethod = await getSetting('molliePaymentMethod', 'capture');

    const mollieClient = createMollieClient({ apiKey });

    // Create a PaymentIntent with the order amount and currency
    const payment = await mollieClient.payments.create({
      amount: {
        value: smallestUnit.default(cart.grand_total, cart.currency),
        currency: cart.currency
      },
      description: `Payment for order ${order_id}`,
      redirectUrl: '',
      webhookUrl: '',
      metadata: {
        cart_id,
        order_id
      }
      // automatic_payment_methods: {
      //   enabled: true
      // },
      // capture_method:
      //   molliePaymentMethod === 'capture' ? 'automatic_async' : 'manual'
    });

    response.status(OK);
    response.json({
      data: {
        // clientSecret: payment.getCheckoutUrl()
        checkoutUrl: payment.getCheckoutUrl()
      }
    });
  }
};
