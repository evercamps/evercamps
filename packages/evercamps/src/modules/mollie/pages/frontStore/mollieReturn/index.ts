import {
  commit,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { createMollieClient } from '@mollie/api-client';
import { error } from '../../../../../lib/log/logger.js';
import { getConnection, pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { addNotification } from '../../../../base/services/notifications.js';
import { updatePaymentStatus } from '../../../../oms/services/updatePaymentStatus.js';
import { getMollieApiKey } from '../../../services/getMollieApiKey.js';
import type { EvercampsRequest } from '../../../../../types/request.js';
import type { EvercampsResponse } from '../../../../../types/response.js';
import type { ENext } from '../../../../../types/middleware.js';

export default async (request: EvercampsRequest, response: EvercampsResponse, _next: ENext) => {
  try {
    const { order_id } = request.query as { order_id: string };

    if (!order_id) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'mollie')
      .load(pool);

    if (!order) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const apiKey = await getMollieApiKey();
    if (!apiKey) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const transaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .load(pool);

    if (!transaction) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const mollieClient = createMollieClient({ apiKey });
    const payment = await mollieClient.payments.get(transaction.transaction_id);

    switch (payment.status) {
      case 'paid':
      case 'authorized':
      case 'pending':
      case 'open':
        // Paid or still in progress — webhook will confirm. Go to success page.
        response.redirect(buildUrl('checkoutSuccess', { orderId: order_id }));
        return;

      case 'failed':
      case 'canceled':
      case 'expired': {
        const connection: PoolClient = await getConnection();
        await startTransaction(connection);
        try {
          await update('cart')
            .given({ status: true })
            .where('cart_id', '=', order.cart_id)
            .execute(connection);
          await updatePaymentStatus(order.order_id, 'canceled', connection);
          await commit(connection);
        } catch (err) {
          await rollback(connection);
          throw err;
        }
        addNotification(request, 'Payment failed or was canceled', 'error');
        request.session.save(() => {
          response.redirect(buildUrl('cart'));
        });
        return;
      }

      default:
        response.redirect(buildUrl('homepage'));
    }
  } catch (e) {
    error(e);
    response.redirect(buildUrl('homepage'));
  }
};
