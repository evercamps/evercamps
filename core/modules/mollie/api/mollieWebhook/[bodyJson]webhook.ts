import {
  insert,
  startTransaction,
  commit,
  rollback,
  select
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getMollieApiKey } from '../../services/getMollieApiKey.js';
import { createMollieClient } from '@mollie/api-client';
import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import type { ENext } from '../../../../types/middleware.js';

type MollieRefundsResponse = {
  _embedded: {
    refunds: Array<{
      id: string;
      amount: { value: string; currency: string };
      status: string;
    }>;
  };
};

export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  const paymentId = (request.body as { id: string }).id;

  debug(`Received webhook call with payment id: ${paymentId}`);

  const connection: PoolClient = await getConnection();

  try {
    await startTransaction(connection);
    const transaction = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', paymentId)
      .load(connection);

    if (!transaction) {
      error('transaction id not found');
      response.status(200).send();
      return;
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
      return;
    }

    debug(`Mollie create client with apikey ${apiKey}`);
    const mollieClient = createMollieClient({ apiKey });

    const payment = await mollieClient.payments.get(paymentId);

    if (!payment) {
      error('no payment found');
      response.json({ received: true });
      return;
    }

    debug(JSON.stringify(payment));

    switch (payment.status) {
      case 'paid':
        debug(`payment status paid received: ${paymentId}`);

        if (
          order.payment_status === 'paid' ||
          order.payment_status === 'refunded' ||
          order.payment_status === 'partial_refunded'
        ) {
          debug(`${JSON.stringify(payment.amountRefunded)}`);
          if (payment.amountRefunded && Number(payment.amountRefunded.value) > 0) {
            const amountRemaining = payment.amountRemaining;
            const status =
              !amountRemaining || Number(amountRemaining.value) <= 0
                ? 'refunded'
                : 'partial_refunded';
            await updatePaymentStatus(order.order_id, status, connection);

            const refundsResponse = await fetch(
              `https://api.mollie.com/v2/payments/${paymentId}/refunds`,
              {
                headers: {
                  method: 'GET',
                  Authorization: `Bearer ${apiKey}`
                }
              }
            );
            const refunds = (await refundsResponse.json()) as MollieRefundsResponse;

            let comment = '';
            for (const refund of refunds._embedded.refunds) {
              comment += `Refund with id ${refund.id} - amount: ${refund.amount.value} ${refund.amount.currency} - status: ${refund.status}\n`;
            }

            await insert('order_activity')
              .given({
                order_activity_order_id: order.order_id,
                comment
              })
              .execute(connection);
          } else {
            debug(`nothing happened ${JSON.stringify(payment.amountRefunded)}`);
          }
        } else {
          await updatePaymentStatus(order.order_id, 'paid', connection);

          await insert('order_activity')
            .given({
              order_activity_order_id: order.order_id,
              comment: `Customer paid by using Mollie.`
            })
            .execute(connection);

          await emit('order_placed', { ...order });
        }
        break;
      case 'expired':
      case 'failed':
        debug('payment expired or failed status received');
        await updatePaymentStatus(order.order_id, 'canceled', connection);
        await insert('order_activity')
          .given({
            order_activity_order_id: order.order_id,
            comment: `Payment was expired or failed`
          })
          .execute(connection);
        break;
      case 'authorized':
        break;
      case 'canceled':
        debug('payment canceled status received');
        await updatePaymentStatus(order.order_id, 'canceled', connection);
        await insert('order_activity')
          .given({
            order_activity_order_id: order.order_id,
            comment: `Customer canceled the payment.`
          })
          .execute(connection);
        break;
      default:
        debug(`Unhandled mollie status type ${payment.status}`);
    }

    await commit(connection);
    response.json({ received: true });
  } catch (err) {
    error(err);
    await rollback(connection);
    response.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }
};
