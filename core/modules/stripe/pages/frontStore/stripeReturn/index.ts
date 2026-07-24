import type { Response, NextFunction } from 'express';
import { select, update } from '@evershop/postgres-query-builder';
import stripePayment from 'stripe';

import { error } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { addNotification } from '../../../../../modules/base/services/notifications.js';
import { updatePaymentStatus } from '../../../../../modules/oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../../../modules/setting/services/setting.js';
import type { EvercampsRequest } from '../../../../../types/request.js';

export default async (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  try {
    const { order_id, payment_intent } = request.query as {
      order_id?: string;
      payment_intent?: string;
    };

    if (!order_id || !payment_intent) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);

    if (!order) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const stripeConfig = getConfig('system.stripe', {}) as {
      secretKey?: string;
    };

    let stripeSecretKey: string;

    if (stripeConfig.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }

    const stripePaymentMode = await getSetting(
      'stripePaymentMode',
      'capture'
    );

    const stripe = new stripePayment(stripeSecretKey, {
      apiVersion: '2020-08-27'
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment_intent
    );

    if (
      (stripePaymentMode === 'capture' &&
        paymentIntent.status === 'succeeded') ||
      (stripePaymentMode === 'authorizeOnly' &&
        paymentIntent.status === 'requires_capture')
    ) {
      response.redirect(
        buildUrl('checkoutSuccess', { orderId: order_id })
      );
      return;
    }

    await update('cart')
      .given({ status: true })
      .where('cart_id', '=', order.cart_id)
      .execute(pool);

    await updatePaymentStatus(order.order_id, 'failed');

    addNotification(request, 'Payment failed', 'error');

    request.session.save(() => {
      response.redirect(buildUrl('cart'));
    });
  } catch (e) {
    error(e instanceof Error ? e.message : e);
    response.redirect(buildUrl('homepage'));
  }
};