import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import type { ENext } from '../../../../types/middleware.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { sendOrderConfirmation } from '../../services/orderEmails.js';

/**
 * Re-renders the order confirmation from the code template with the current
 * order data, so it also works after the logged body was removed.
 */
export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  try {
    const order = await select('order_id')
      .from('order')
      .where('uuid', '=', String(request.params.id))
      .load(pool);
    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({ error: { status: INVALID_PAYLOAD, message: 'Order not found' } });
      return;
    }
    const result = await sendOrderConfirmation(order.order_id, true);
    response.status(OK);
    response.json({ data: { status: result.status, error: result.error ?? null } });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message }
    });
  }
};
