import { execute } from '@evershop/postgres-query-builder';

// Fiscal attest eligibility per camp, as a column on product (set on the
// product form, like manage_registrations) - core/.docs/fiscal-attests.md 1b-bis.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "product"
     ADD COLUMN IF NOT EXISTS "fiscal_attest_eligible" boolean NOT NULL DEFAULT false`
  );

  // An earlier Version-1.1.0 stored this as a select attribute
  // "fiscal_attest_eligible" (Ja / Nee). Carry its "Ja" values over, then
  // remove the attribute (cascades to its options, product values and
  // attribute-group links). No-op when the attribute never existed.
  await execute(
    connection,
    `UPDATE "product" p
     SET "fiscal_attest_eligible" = true
     FROM "product_attribute_value_index" v
     JOIN "attribute" a ON a.attribute_id = v.attribute_id
     JOIN "attribute_option" o ON o.attribute_option_id = v.option_id
     WHERE v.product_id = p.product_id
       AND a.attribute_code = 'fiscal_attest_eligible'
       AND o.option_text = 'Ja'`
  );
  await execute(
    connection,
    `DELETE FROM "attribute" WHERE "attribute_code" = 'fiscal_attest_eligible'`
  );
};
