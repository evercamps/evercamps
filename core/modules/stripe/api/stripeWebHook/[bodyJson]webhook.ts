import {
  insert,
  startTransaction,
  commit,
  rollback,
  select,
  insertOnUpdate
} from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import { display } from 'zero-decimal-currencies';
import type { Response, NextFunction } from 'express';

import { emit } from '../../../../lib/event/emitter.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import type { EvercampsRequest } from '../../../../types/request.js';

export default async (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  const sig = request.headers['stripe-signature'];

  let event: Stripe.Event;

  const connection = await getConnection();

  try {
    const stripeConfig: any = getConfig('system.stripe', {});

    let stripeSecretKey: string;

    if (stripeConfig.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2020-08-27'
    });

    let endpointSecret: string;

    if (stripeConfig.endpointSecret) {
      endpointSecret = stripeConfig.endpointSecret;
    } else {
      endpointSecret = await getSetting('stripeEndpointSecret', '');
    }

    if (!sig) {
      throw new Error('Missing Stripe signature');
    }

    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      endpointSecret
    );

    await startTransaction(connection);

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { order_id } = paymentIntent.metadata;

    const transaction: any = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', paymentIntent.id)
      .load(connection);

    const order: any = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(connection);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        debug('payment_intent.succeeded event received');

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
                ? 'Manual'
                : 'Automatic'
          })
          .execute(connection);

        if (!transaction) {
          await updatePaymentStatus(
            order.order_id,
            'paid',
            connection
          );

          await insert('order_activity')
            .given({
              order_activity_order_id: order.order_id,
              comment: `Customer paid by using Stripe. Transaction ID: ${paymentIntent.id}`
            })
            .execute(connection);

          await emit('order_placed', { ...order });
        }

        break;
      }

      case 'payment_intent.amount_capturable_updated': {
        debug(
          'payment_intent.amount_capturable_updated event received'
        );

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
          await updatePaymentStatus(
            order.order_id,
            'authorized',
            connection
          );

          await insert('order_activity')
            .given({
              order_activity_order_id: order.order_id,
              comment: `Customer authorized by using Stripe. Transaction ID: ${paymentIntent.id}`
            })
            .execute(connection);

          await emit('order_placed', { ...order });
        }

        break;
      }

      case 'payment_intent.canceled': {
        debug('payment_intent.canceled event received');

        await updatePaymentStatus(
          order.order_id,
          'canceled',
          connection
        );

        break;
      }

      default: {
        debug(`Unhandled event type ${event.type}`);
      }
    }

    await commit(connection);

    response.json({
      received: true
    });
  } catch (err) {
    error(err);

    await rollback(connection);

    response
      .status(400)
      .send(
        `Webhook Error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
  }
};