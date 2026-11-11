import { execute } from '@evershop/postgres-query-builder';

// FK + backfill for registration.product_variant_id (added in Version-1.0.3).
// Runs after catalog's Version-1.1.1 (catalog migrates before camp), so every
// product without real variants has a default variant by now.
export default async (connection: any) => {
  // Clear ids of variants that no longer exist (e.g. removed by the
  // WooCommerce importer's deleteStaleVariants) so the FK can be created.
  await execute(
    connection,
    `UPDATE "registration" r
     SET "product_variant_id" = NULL
     WHERE r.product_variant_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "product_variant" v WHERE v.product_variant_id = r.product_variant_id
       )`
  );

  // Registrations without a variant get their product's default variant.
  // Products with several real variants have no default; those rows stay NULL.
  await execute(
    connection,
    `UPDATE "registration" r
     SET "product_variant_id" = v.product_variant_id
     FROM "product_variant" v
     WHERE r.product_variant_id IS NULL
       AND v.product_id = r.registration_product_id
       AND v.is_default = true`
  );

  await execute(
    connection,
    `ALTER TABLE "registration"
     DROP CONSTRAINT IF EXISTS "FK_REGISTRATION_PRODUCT_VARIANT"`
  );
  await execute(
    connection,
    `ALTER TABLE "registration"
     ADD CONSTRAINT "FK_REGISTRATION_PRODUCT_VARIANT"
     FOREIGN KEY ("product_variant_id")
     REFERENCES "product_variant" ("product_variant_id")
     ON DELETE SET NULL`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FK_REGISTRATION_PRODUCT_VARIANT"
     ON "registration" ("product_variant_id")`
  );
};
