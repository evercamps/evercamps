import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

/**
 * After-hook on core checkout `saveOrderItems(cart, orderId, connection)`:
 * the payer's national number entered at checkout (extra field
 * payer_national_number) becomes order_item_registration.payer_national_number
 * (a snapshot for the fiscal attest) and, when the customer has none yet,
 * customer.national_number. Runs in the order's transaction.
 */
export async function copyPayerNationalNumbers(
  _result: unknown,
  cart: { getData(key: string): any },
  orderId: number,
  connection: PoolClient
): Promise<void> {
  await execute(
    connection,
    `UPDATE "order_item_registration" oir
     SET "payer_national_number" = oir."extra_data"::jsonb ->> 'payer_national_number'
     FROM "order_item" oi
     WHERE oi.order_item_id = oir.order_item_id
       AND oi.order_item_order_id = ${Number(orderId)}
       AND oir."payer_national_number" IS NULL
       AND oir."extra_data" IS NOT NULL
       AND (oir."extra_data"::jsonb ->> 'payer_national_number') IS NOT NULL`
  );

  const customerId = Number(cart.getData('customer_id'));
  if (customerId) {
    await execute(
      connection,
      `UPDATE "customer" c
       SET "national_number" = latest.payer_national_number
       FROM (
         SELECT oir.payer_national_number
         FROM "order_item_registration" oir
         JOIN "order_item" oi ON oi.order_item_id = oir.order_item_id
         WHERE oi.order_item_order_id = ${Number(orderId)}
           AND oir.payer_national_number IS NOT NULL
         ORDER BY oir.order_item_registration_id DESC
         LIMIT 1
       ) latest
       WHERE c.customer_id = ${customerId}
         AND c.national_number IS NULL`
    );
  }
}
