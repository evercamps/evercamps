import { select } from '@evershop/postgres-query-builder';
import type { Pool, PoolClient } from 'pg';
import { camelCase } from '../../../../../lib/util/camelCase.js';

interface Context {
  pool: Pool | PoolClient;
}

interface Order {
  orderId: number;
}

export default {
  Order: {
    paymentTransactions: async (
      { orderId }: Order,
      _: unknown,
      { pool }: Context
    ) => {
      const items = await select()
        .from('payment_transaction')
        .where('payment_transaction_order_id', '=', orderId)
        .execute(pool);

      return items.map((item) => camelCase(item));
    }
  }
};