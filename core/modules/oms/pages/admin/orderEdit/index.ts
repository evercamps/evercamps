import type { NextFunction, Request, Response } from 'express';
import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';

interface Order {
  uuid: string;
  currency: string;
  order_number: string;
}

export default async (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  try {
    const query = select();
    query.from('order');
    query.andWhere('order.uuid', '=', request.params.id);

    const order = (await query.load(pool)) as Order | null;

    if (order === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'orderId', order.uuid);
      setContextValue(request, 'orderCurrency', order.currency);
      setContextValue(request, 'pageInfo', {
        title: `Order #${order.order_number}`,
        description: `Order #${order.order_number}`
      });

      next();
    }
  } catch (e) {
    next(e);
  }
};