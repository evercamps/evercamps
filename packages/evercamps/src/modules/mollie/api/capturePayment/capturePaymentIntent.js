import { select } from '@evershop/postgres-query-builder';
import stripePayment from 'stripe';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import createMollieClient from '@mollie/api-client';

export default async (request, response, next) => {
  try {
    const { order_id } = request.body;
    // Load the order
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);
    if (!order || order.payment_method !== 'mollie') {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    // Get the payment transaction
    const paymentTransaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .load(pool);
    if (!paymentTransaction) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not find payment transaction'
        }
      });
      return;
    }

    const mollieConfig = getConfig('system.mollie', {});
    let apiKey;

    if (mollieConfig.apiKey) {
      apiKey = mollieConfig.apiKey;
    } else {
      apiKey = await getSetting('mollieApiKey', '');
    }
    const mollieClient = createMollieClient(apiKey);
    // Retrieve the PaymentIntent
    const payment = await mollieClient.payments.get(
      paymentTransaction.transaction_id
    );
    if (!paymentIntent) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid payment intent'
        }
      });
    }
    if (paymentIntent.status !== 'requires_capture') {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message:
            'Payment intent is not in the correct state (requires_capture)'
        }
      });
    }
    // Capture the PaymentIntent
    await stripe.paymentIntents.capture(paymentTransaction.transaction_id);
    // Update the order status to paid
    await updatePaymentStatus(order.order_id, 'paid');
    response.status(OK);
    response.json({
      data: {
        amount: paymentIntent.amount
      }
    });
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }
    });
  }
};
