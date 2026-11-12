import { execute } from '@evershop/postgres-query-builder';

// belgian-administration 1.1.0 (core/.docs/fiscal-attests.md, 1b-bis + 1c):
// - carries over state from the old plugin name "national-number-field"
// - payer national number (customer + snapshot per registration)
//
// Migrations are tracked per plugin name, so after the rename Version-1.0.0
// runs again under "belgian-administration"; it only uses ADD COLUMN IF NOT
// EXISTS, so that's a no-op. Everything here is idempotent too.
export default async (connection: any) => {
  // --- Rename leftovers -----------------------------------------------------
  // An on/off override saved from /plugin-management under the old name
  // would otherwise be lost; copy it to the new name, then drop the old row.
  await execute(
    connection,
    `INSERT INTO "setting" ("name", "value", "is_json")
     SELECT 'plugin_enabled.belgian-administration', s.value, s.is_json
     FROM "setting" s
     WHERE s.name = 'plugin_enabled.national-number-field'
       AND NOT EXISTS (SELECT 1 FROM "setting" WHERE name = 'plugin_enabled.belgian-administration')`
  );
  await execute(
    connection,
    `DELETE FROM "setting" WHERE "name" = 'plugin_enabled.national-number-field'`
  );
  await execute(
    connection,
    `DELETE FROM "migration" WHERE "module" = 'national-number-field'`
  );

  // --- Payer national number --------------------------------------------------
  await execute(
    connection,
    `ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "national_number" varchar DEFAULT NULL`
  );
  // Snapshot per registration, so a later profile edit doesn't change
  // historic fiscal attests.
  await execute(
    connection,
    `ALTER TABLE "order_item_registration" ADD COLUMN IF NOT EXISTS "payer_national_number" varchar DEFAULT NULL`
  );

  // The WooCommerce import already stored "Rijksregisternummer ouder" in
  // extra_data.payer_national_number; promote it to the column, and to the
  // customer when the customer doesn't have one yet (latest registration wins).
  await execute(
    connection,
    `UPDATE "order_item_registration"
     SET "payer_national_number" = "extra_data"::jsonb ->> 'payer_national_number'
     WHERE "payer_national_number" IS NULL
       AND "extra_data" IS NOT NULL
       AND ("extra_data"::jsonb ->> 'payer_national_number') IS NOT NULL`
  );
  await execute(
    connection,
    `UPDATE "customer" c
     SET "national_number" = latest.payer_national_number
     FROM (
       SELECT DISTINCT ON (customer_id) customer_id, payer_national_number
       FROM "order_item_registration"
       WHERE customer_id IS NOT NULL AND payer_national_number IS NOT NULL
       ORDER BY customer_id, order_item_registration_id DESC
     ) latest
     WHERE c.customer_id = latest.customer_id
       AND c.national_number IS NULL`
  );

  // (Fiscal attest eligibility is a column on product, added in Version-1.3.0.
  // An earlier version of this migration created a "fiscal_attest_eligible"
  // attribute instead; 1.3.0 converts and removes it where it exists.)
};
