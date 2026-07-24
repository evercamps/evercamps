import {
  select,
  getConnection,
  startTransaction,
  insert,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import smallestUnit from 'zero-decimal-currencies';
import type { Response, NextFunction } from 'express';

import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import type { EvercampsRequest } from '../../../../types/request.js';

export default async (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  const connection = await getConnection(pool);

  try {
    await startTransaction(connection);

    const { order_id, amount } = request.body;

    const order: any = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(connection);

    if (!order || order.payment_method !== 'stripe') {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    const paymentTransaction: any = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .load(connection);

    if (!paymentTransaction) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not find payment transaction'
        }
      });
      return;
    }

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

    const refund = await stripe.refunds.create({
      payment_intent: paymentTransaction.transaction_id,
      amount: Number(smallestUnit(amount, order.currency))
    });

    const charge = await stripe.charges.retrieve(
      refund.charge as string
    );

    const status =
      charge.refunded === true ? 'refunded' : 'partial_refunded';

    await updatePaymentStatus(order.order_id, status, connection);

    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: `Refunded ${amount} ${charge.currency}`
      })
      .execute(connection);

    await commit(connection);

    response.status(OK).json({
      data: {
        amount: refund.amount
      }
    });
  } catch (err) {
    error(err);

    await rollback(connection);

    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err instanceof Error ? err.message : String(err)
      }
    });
  }
};