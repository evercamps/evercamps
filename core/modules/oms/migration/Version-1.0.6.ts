import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  // Repair for databases installed before the oms migrations were renumbered
  // (#118). Those were already at oms 1.0.3 under the old numbering (where
  // 1.0.3 added registration_id), so the new Version-1.0.3 that adds
  // order_item_registration.customer_id never ran on them. Idempotent, so it's
  // a no-op on fresh installs.
  await execute(
    connection,
    `ALTER TABLE order_item_registration ADD COLUMN IF NOT EXISTS customer_id INT`
  );
  await execute(
    connection,
    `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_customer'
          AND conrelid = 'order_item_registration'::regclass
      ) THEN
        ALTER TABLE order_item_registration
          ADD CONSTRAINT FK_CUSTOMER
          FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE SET NULL;
      END IF;
    END $$`
  );
};
