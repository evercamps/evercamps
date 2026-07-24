import { select } from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import smallestUnit from 'zero-decimal-currencies';
import type { Response, NextFunction } from 'express';

import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import type { EvercampsRequest } from '../../../../types/request.js';

export default async (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  const { cart_id, order_id } = request.body;

  const cart: any = await select()
    .from('cart')
    .where('uuid', '=', cart_id)
    .load(pool);

  if (!cart) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid cart'
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

  const stripePaymentMode = await getSetting('stripePaymentMode', 'capture');

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2020-08-27'
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(smallestUnit(cart.grand_total, cart.currency)),
    currency: cart.currency,
    metadata: {
      cart_id,
      order_id
    },
    automatic_payment_methods: {
      enabled: true
    },
    capture_method:
      stripePaymentMode === 'capture'
        ? 'automatic'
        : 'manual'
  });

  response.status(OK).json({
    data: {
      clientSecret: paymentIntent.client_secret
    }
  });
};