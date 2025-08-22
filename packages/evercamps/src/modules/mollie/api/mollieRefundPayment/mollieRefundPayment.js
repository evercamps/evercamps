import {
  select,
  getConnection,
  startTransaction,
  insert,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import { error, debug } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import { getMollieApiKey } from '../../services/getMollieApiKey.js';
import { createMollieClient } from '@mollie/api-client';

export default async (request, response, next) => {
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);

    const { order_id, amount } = request.body;
    // Load the order
    const order = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(connection);

    if (!order || order.payment_method !== 'mollie') {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    // Get the payment transaction
    const paymentTransaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .load(connection);

    if (!paymentTransaction) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not find payment transaction'
        }
      });
      return;
    }

    const apiKey = await getMollieApiKey();
    const mollieClient = createMollieClient({ apiKey });
    debug(`We want to refund amount: ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`);

    // Refund
    const refund = await mollieClient.paymentRefunds.create({
      paymentId: paymentTransaction.transaction_id,
      amount: {
        value: new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount),
        currency: order.currency
      },
      metadata: {
        order_id: order.order_id
      }
    });

    // Add transaction data to database
    await insert('payment_transaction')
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: refund.id,
        parent_transaction_id: paymentTransaction.transaction_id,
        amount: amount,
        currency: order.currency,
        payment_action: 'refund',
        transaction_type: 'online',
        additional_information: JSON.stringify(refund)
      })
      .execute(pool);

    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: `Refund request ${refund.amount.value} ${refund.amount.currency} with mollie refund-id ${refund.id}`
      })
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: {
        amount: refund.amount.value
      }
    });
  } catch (err) {
    error(err);
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
