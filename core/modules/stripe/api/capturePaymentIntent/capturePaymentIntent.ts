import { select } from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
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
): Promise<void> => {
  try {
    const { order_id } = request.body;

    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);

    if (!order || order.payment_method !== 'stripe') {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    const paymentTransaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .load(pool);

    if (!paymentTransaction) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not find payment transaction'
        }
      });
      return;
    }

    const stripeConfig = getConfig('system.stripe', {}) as any;
    const stripeSecretKey =
      stripeConfig.secretKey ??
      (await getSetting('stripeSecretKey', ''));

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2020-08-27'
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentTransaction.transaction_id
    );

    if (!paymentIntent) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid payment intent'
        }
      });
      return;
    }

    if (paymentIntent.status !== 'requires_capture') {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message:
            'Payment intent is not in the correct state (requires_capture)'
        }
      });
      return;
    }

    await stripe.paymentIntents.capture(paymentTransaction.transaction_id);

    await updatePaymentStatus(order.order_id, 'paid');

    response.status(OK).json({
      data: {
        amount: paymentIntent.amount
      }
    });
  } catch (err) {
    error(err);

    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }
    });
  }
};