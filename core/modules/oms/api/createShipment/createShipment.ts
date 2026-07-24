import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { Response, NextFunction } from 'express';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { updateShipmentStatus } from '../../services/updateShipmentStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
) => {
  const connection = await getConnection();
  await startTransaction(connection);

  const { id } = request.params;
  const { carrier, tracking_number } = request.body;

  try {
    const order = await select()
      .from('order')
      .where('uuid', '=', id)
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
      .where('shipment_order_id', '=', order.order_id)
      .load(connection);

    if (shipment) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipment was created'
        }
      });
      return;
    }

    const result = await insert('shipment')
      .given({
        shipment_order_id: order.order_id,
        carrier,
        tracking_number
      })
      .execute(connection);

    // Update shipment status to shipped
    await updateShipmentStatus(order.order_id, 'shipped', connection);

    // Add an activity log message
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Order was shipped',
        customer_notified: 0
      })
      .execute(connection);

    await commit(connection);

    const shipmentData = await select()
      .from('shipment')
      .where('shipment_id', '=', result.insertId)
      .load(pool);

    response.status(OK);
    response.$body = {
      data: shipmentData
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