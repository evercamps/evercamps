import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import type { ENext } from '../../../../types/middleware.js';

export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  const { order_id } = request.body as { order_id: string };

  const order = await select()
    .from('order')
    .where('uuid', '=', order_id)
    .and('payment_method', '=', 'cod')
    .and('payment_status', '=', 'pending')
    .load(pool);

  if (!order) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Requested order does not exist or is not in pending payment status'
      }
    });
  } else {
    await updatePaymentStatus(order.order_id as number, 'paid');

    await insert('payment_transaction')
      .given({
        payment_transaction_order_id: order.order_id,
        amount: order.grand_total,
        currency: order.currency,
        payment_action: 'capture',
        transaction_type: 'offline'
      })
      .execute(pool);

    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Customer paid using cash.',
        customer_notified: 0
      })
      .execute(pool);

    response.status(OK);
    response.json({
      data: {}
    });
  }
};
