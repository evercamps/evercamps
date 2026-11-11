import { execute } from '@evershop/postgres-query-builder';

// belgian-administration 1.1.0 (core/.docs/fiscal-attests.md, 1b-bis + 1c):
// - carries over state from the old plugin name "national-number-field"
// - payer national number (customer + snapshot per registration)
// - "fiscal_attest_eligible" product attribute (Ja / Nee)
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

  // --- fiscal_attest_eligible attribute -------------------------------------------
  // Set per camp by the admin: does this camp qualify for a fiscal attest?
  // Not shown on the storefront and not filterable.
  await execute(
    connection,
    `INSERT INTO "attribute" ("attribute_code", "attribute_name", "type", "is_required", "display_on_frontend", "is_filterable", "sort_order")
     SELECT 'fiscal_attest_eligible', 'Fiscaal attest', 'select', false, false, false, 100
     WHERE NOT EXISTS (SELECT 1 FROM "attribute" WHERE attribute_code = 'fiscal_attest_eligible')`
  );
  for (const optionText of ['Ja', 'Nee']) {
    await execute(
      connection,
      `INSERT INTO "attribute_option" ("attribute_id", "attribute_code", "option_text")
       SELECT a.attribute_id, a.attribute_code, '${optionText}'
       FROM "attribute" a
       WHERE a.attribute_code = 'fiscal_attest_eligible'
         AND NOT EXISTS (
           SELECT 1 FROM "attribute_option" o
           WHERE o.attribute_id = a.attribute_id AND o.option_text = '${optionText}'
         )`
    );
  }
  // Link it to every attribute group, so it shows on every product form.
  // Groups created later need it added by hand (see README).
  await execute(
    connection,
    `INSERT INTO "attribute_group_link" ("attribute_id", "group_id")
     SELECT a.attribute_id, g.attribute_group_id
     FROM "attribute" a CROSS JOIN "attribute_group" g
     WHERE a.attribute_code = 'fiscal_attest_eligible'
     ON CONFLICT ("attribute_id", "group_id") DO NOTHING`
  );
};
