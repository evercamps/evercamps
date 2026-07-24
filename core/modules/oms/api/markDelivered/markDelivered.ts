import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { Response, NextFunction } from 'express';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { updateShipmentStatus } from '../../services/updateShipmentStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';

interface DeliverShipmentRequestBody {
  order_id: number;
}

interface EvercampsResponse extends Response {
  $body?: {
    data: {
      order_id: number;
      shipment_id: number;
    };
  };
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
) => {
  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const { order_id } = request.body as DeliverShipmentRequestBody;

    const order = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(connection);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order id'
        }
      });
      return;
    }

    const shipment = await select()
      .from('shipment')
      .where('shipment_order_id', '=', order_id)
      .load(connection);

    if (!shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipment was not created'
        }
      });
      return;
    }

    await updateShipmentStatus(order_id, 'delivered', connection);

    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Order delivered',
        customer_notified: 0
      })
      .execute(connection);

    await commit(connection);

    response.status(OK);

    response.$body = {
      data: {
        order_id: order.order_id,
        shipment_id: shipment.shipment_id
      }
    };

    next();
  } catch (e) {
    await rollback(connection);

    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
};