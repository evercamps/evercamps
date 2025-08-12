import { select } from '@evershop/postgres-query-builder';
import { createMollieClient } from '@mollie/api-client';
import smallestUnit from 'zero-decimal-currencies';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import { debug, error } from '../../../../lib/log/logger.js';

export default async (request, response, next) => {
  try {

    const { order_id } = request.body;

    debug(`Mollie create payment from order ${order_id}`);

    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'mollie')
      .and('payment_status', '=', 'pending')
      .load(pool);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
    } else {
      const mollieConfig = getConfig('system.mollie', {});
      debug(`Mollie config ${JSON.stringify(mollieConfig)}`)
      let apiKey;
      if (mollieConfig.mollieLiveApiKey || mollieConfig.mollieTestApiKey) {
        apiKey = mollieConfig.molliePaymentMode ? mollieConfig.mollieLiveApiKey : mollieConfig.mollieTestApiKey;
      } else {
        const mollieLiveApiKey = await getSetting('mollieLiveApiKey', null);
        const mollieTestApiKey = await getSetting('mollieTestApiKey', null);
        const molliePaymentMode = await getSetting('molliePaymentMode', 0);
        debug(`Mollie config ${mollieLiveApiKey}, ${mollieTestApiKey}, ${molliePaymentMode}`);

        apiKey = parseInt(molliePaymentMode, 10) === 1 ? mollieLiveApiKey : mollieTestApiKey;

        if (!apiKey) {
          response.status(INVALID_PAYLOAD);
          response.json({
            error: {
              status: INVALID_PAYLOAD,
              message: 'Invalid apikey'
            }
          });
        }
      }

      debug(`Mollie create client with apikey ${apiKey}`);

      const mollieClient = createMollieClient({ apiKey: apiKey });

      debug(`Create Mollie payment from order ${JSON.stringify(order)}`);
      debug(`Create Mollie payment with total amount ${new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(order.sub_total_with_discount_incl_tax)}`);
      // Create a Payment with the order amount and currency
      const payment = await mollieClient.payments.create({
        amount: {
          value: new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(order.sub_total_with_discount_incl_tax),
          currency: order.currency
        },
        description: `Payment for order ${order_id}`,
        redirectUrl: 'https://demo.evercamps.io/done',
        webhookUrl: 'https://demo.evercamps.io/webhook',
        metadata: {
          order_id
        }
      });

      response.status(OK);
      response.json({
        data: {
          // clientSecret: payment.getCheckoutUrl()
          returnUrl: payment.getCheckoutUrl()
        }
      });
    }
  }
  catch (err) {
    error(err);
    return next(err);
  }
};
