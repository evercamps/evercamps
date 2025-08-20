import {
  insert,
  startTransaction,
  commit,
  rollback,
  select,
  insertOnUpdate
} from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getMollieApiKey } from '../../services/getMollieApiKey.js';
import { createMollieClient } from '@mollie/api-client';
import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {

  const paymentId = request.body.id;

  debug(`Received webhook call with payment id: ${paymentId}`);

  const connection = await getConnection();

  try {

    await startTransaction(connection);
    const transaction = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', paymentId)
      .load(connection);


    if (!transaction) {
      error("transaction id not found");
      response.status(200).send();
    }

    const order = await select()
      .from('order')
      .where('order_id', '=', transaction.payment_transaction_order_id)
      .load(connection);

    const apiKey = await getMollieApiKey();

    if (!apiKey) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid apikey'
        }
      });
    }

    debug(`Mollie create client with apikey ${apiKey}`);
    const mollieClient = createMollieClient({ apiKey: apiKey });

    const payment = await mollieClient.payments.get(paymentId);

    if(!payment) {
      error("no payment found");
      response.json({ received: true });
      return;
    }

    debug(JSON.stringify(payment));

    switch (payment.status) {
      case "paid":
        debug(`payment status paid received: ${paymentId}`);

        // Update the order
        await updatePaymentStatus(order.order_id, 'paid', connection);

        // Add an activity log
        await insert('order_activity')
          .given({
            order_activity_order_id: order.order_id,
            comment: `Customer paid by using Mollie.`
          })
          .execute(connection);

        // Emit event to add order placed event // do I need to do this?
        await emit('order_placed', { ...order });
        break;
      case "expired":
      case "failed":
        debug('payment expired or failed status received');
        await updatePaymentStatus(order.order_id, 'canceled', connection);
        // Add an activity log
        await insert('order_activity')
          .given({
            order_activity_order_id: order.order_id,
            comment: `Payment was expired or failed`
          })
          .execute(connection);
        break;
      case "authorized":
        break;
      case "canceled":
        debug('payment canceled status received');
        await updatePaymentStatus(order.order_id, 'canceled', connection);
        // Add an activity log
        await insert('order_activity')
          .given({
            order_activity_order_id: order.order_id,
            comment: `Customer canceled the payment.`
          })
          .execute(connection);
        break;
      default: {
        debug(`Unhandled mollie status type ${payment.status}`);
      }
    }

    await commit(connection);
    // Return a response to acknowledge receipt of the event
    response.json({ received: true });

  } catch (err) {
    error(err);
    await rollback(connection);
    response.status(400).send(`Webhook Error: ${err.message}`);
  }
};
