import { select, insert } from '@evershop/postgres-query-builder';
import { createMollieClient } from '@mollie/api-client';
import { pool } from '../../../../lib/postgres/connection.js';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { buildAbsoluteUrl } from '../../../../lib/router/buildAbsoluteUrl.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getMollieApiKey } from '../../services/getMollieApiKey.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import type { ENext } from '../../../../types/middleware.js';

export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  try {
    const { order_id } = request.body as { order_id: string };
    debug(`Mollie create payment from order ${order_id}`);

    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'mollie')
      .and('payment_status', '=', 'pending')
      .load(pool);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    const apiKey = await getMollieApiKey();
    debug(`getMollie Api key ${apiKey}`);

    if (!apiKey) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid apikey'
        }
      });
      return;
    }

    debug(`Mollie create client with apikey ${apiKey}`);

    const mollieClient = createMollieClient({ apiKey });

    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(order.grand_total);

    debug(`Create Mollie payment with total amount ${formattedAmount}`);

    const payment = await mollieClient.payments.create({
      amount: {
        value: formattedAmount,
        currency: order.currency
      },
      description: `Payment for order #${order.order_number}`,
      redirectUrl: `${buildAbsoluteUrl('mollieReturn')}?order_id=${order_id}`,
      webhookUrl: buildAbsoluteUrl('mollieWebhook'),
      metadata: {
        order_id
      }
    });

    await updatePaymentStatus(order.order_id, 'pending');

    await insert('payment_transaction')
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: payment.id,
        amount: order.grand_total,
        currency: order.currency,
        payment_action: 'capture',
        transaction_type: 'online',
        additional_information: JSON.stringify(payment)
      })
      .execute(pool);

    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: `Customer authorized by using Mollie. Transaction ID: ${payment.id}`
      })
      .execute(pool);

    response.status(OK);
    response.json({
      data: {
        returnUrl: payment.getCheckoutUrl()
      }
    });
  } catch (err) {
    error(err);
    return next(err as Error);
  }
};
