import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

/**
 * After-hook on core checkout `saveOrderItems(cart, orderId, connection)`,
 * runs in the order's transaction. The payer's national number of every
 * registration in the order (order_item_registration.payer_national_number,
 * the snapshot used by the fiscal attest):
 *
 * 1. the number asked at checkout (cart.payer_national_number, see
 *    PayerNationalNumber.tsx) - one payer per order, so it applies to all;
 * 2. otherwise the per-participant extra field payer_national_number
 *    ("Rijksregisternummer ouder"), when that field is enabled.
 *
 * The customer gets the checkout number (it is the customer's own number);
 * a number that only came from a participant field fills an empty one.
 */
export async function copyPayerNationalNumbers(
  _result: unknown,
  cart: { getData(key: string): any },
  orderId: number,
  connection: PoolClient
): Promise<void> {
  const order = Number(orderId);
  const cartId = Number(cart.getData('cart_id'));
  const customerId = Number(cart.getData('customer_id')) || null;

  const { rows } = await connection.query(
    `SELECT payer_national_number FROM cart WHERE cart_id = $1`,
    [cartId]
  );
  const checkoutNumber: string | null = rows[0]?.payer_national_number || null;

  if (checkoutNumber) {
    await connection.query(
      `UPDATE order_item_registration oir
       SET payer_national_number = $1
       FROM order_item oi
       WHERE oi.order_item_id = oir.order_item_id AND oi.order_item_order_id = $2`,
      [checkoutNumber, order]
    );
    if (customerId) {
      await connection.query(`UPDATE customer SET national_number = $1 WHERE customer_id = $2`, [
        checkoutNumber,
        customerId
      ]);
    }
    return;
  }

  await execute(
    connection,
    `UPDATE "order_item_registration" oir
     SET "payer_national_number" = oir."extra_data"::jsonb ->> 'payer_national_number'
     FROM "order_item" oi
     WHERE oi.order_item_id = oir.order_item_id
       AND oi.order_item_order_id = ${order}
       AND oir."payer_national_number" IS NULL
       AND oir."extra_data" IS NOT NULL
       AND (oir."extra_data"::jsonb ->> 'payer_national_number') IS NOT NULL`
  );
  if (customerId) {
    await execute(
      connection,
      `UPDATE "customer" c
       SET "national_number" = latest.payer_national_number
       FROM (
         SELECT oir.payer_national_number
         FROM "order_item_registration" oir
         JOIN "order_item" oi ON oi.order_item_id = oir.order_item_id
         WHERE oi.order_item_order_id = ${order}
           AND oir.payer_national_number IS NOT NULL
         ORDER BY oir.order_item_registration_id DESC
         LIMIT 1
       ) latest
       WHERE c.customer_id = ${customerId}
         AND c.national_number IS NULL`
    );
  }
}
