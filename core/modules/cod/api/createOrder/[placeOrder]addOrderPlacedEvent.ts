import { select } from '@evershop/postgres-query-builder';
import { emit } from '../../../../lib/event/emitter.js';
import { pool } from '../../../../lib/postgres/connection.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import type { ENext } from '../../../../types/middleware.js';

export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  const newOrder = (response.$body.data as Record<string, unknown>) ?? {};
  if (newOrder.payment_method !== 'cod') {
    return next();
  } else {
    const order = await select()
      .from('order')
      .where('order_id', '=', newOrder.order_id)
      .load(pool);
    await emit('order_placed', { ...order });
    return next();
  }
};
