import {
  insert,
  startTransaction,
  commit,
  rollback,
  select,
  insertOnUpdate
} from '@evershop/postgres-query-builder';
import stripePgk from 'stripe';
import { display } from 'zero-decimal-currencies';
import { emit } from '../../../../lib/event/emitter.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';

export default async (request, response, next) => {
  const sig = request.headers['mollie-signature'];

  let event;
  const connection = await getConnection();
  try {
    const mollieConfig = getConfig('system.mollie', {});
    let mollieSecretKey;
    if (stripeConfig.secretKey) {
      mollieSecretKey = stripeConfig.secretKey;
    } else {
      mollieSecretKey = await getSetting('mollieSecretKey', '');
    }
    const stripe = stripePgk(mollieSecretKey);

    // Webhook enpoint secret
    let endpointSecret;
    if (stripeConfig.endpointSecret) {
      endpointSecret = stripeConfig.endpointSecret;
    } else {
      endpointSecret = await getSetting('mollieEndpointSecret', '');
    }

    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    await startTransaction(connection);
    const paymentIntent = event.data.object;
    const { order_id } = paymentIntent.metadata;
    const transaction = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', paymentIntent.id)
      .load(connection);
    // Load the order
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(connection);
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        debug('payment_intent.succeeded event received');
        // Update the order
        // Create payment transaction
        await insertOnUpdate('payment_transaction', [
          'transaction_id',
          'payment_transaction_order_id'
        ])
          .given({
            amount: parseFloat(
              display(paymentIntent.amount, paymentIntent.currency)
            ),
            payment_transaction_order_id: order.order_id,
            transaction_id: paymentIntent.id,
            transaction_type: 'online',
            payment_action:
              paymentIntent.capture_method === 'manual' ? 'Manual' : 'Automatic'
          })
          .execute(connection);

        if (!transaction) {
          await updatePaymentStatus(order.order_id, 'paid', connection);

          // Add an activity log
          await insert('order_activity')
            .given({
              order_activity_order_id: order.order_id,
              comment: `Customer paid by using Stripe. Transaction ID: ${paymentIntent.id}`
            })
            .execute(connection);

          // Emit event to add order placed event
          await emit('order_placed', { ...order });
        }
        break;
      }
      case 'payment_intent.amount_capturable_updated': {
        debug('payment_intent.amount_capturable_updated event received');
        // Create payment transaction
        await insertOnUpdate('payment_transaction', [
          'transaction_id',
          'payment_transaction_order_id'
        ])
          .given({
            amount: parseFloat(
              display(paymentIntent.amount, paymentIntent.currency)
            ),
            payment_transaction_order_id: order.order_id,
            transaction_id: paymentIntent.id,
            transaction_type: 'online',
            payment_action:
              paymentIntent.capture_method === 'manual'
                ? 'authorize'
                : 'capture'
          })
          .execute(connection);

        if (!transaction) {
          await updatePaymentStatus(order.order_id, 'authorized', connection);
          // Add an activity log
          await insert('order_activity')
            .given({
              order_activity_order_id: order.order_id,
              comment: `Customer authorized by using Stripe. Transaction ID: ${paymentIntent.id}`
            })
            .execute(connection);

          // Emit event to add order placed event
          await emit('order_placed', { ...order });
        }
        break;
      }
      case 'payment_intent.canceled': {
        debug('payment_intent.canceled event received');
        await updatePaymentStatus(order.order_id, 'canceled', connection);
        break;
      }
      default: {
        debug(`Unhandled event type ${event.type}`);
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
