import { execute } from '@evershop/postgres-query-builder';

// Thread product_variant_id through cart_item and give it (and the existing
// order_item.product_variant_id from Version-1.0.9) a real FK + index.
//
// Named 1.1.0 rather than 1.0.10: the migration runner
// (includes/bin/lib/bootstrap/migrate.js) only picks up single-digit version
// parts and relies on directory order.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "cart_item"
     ADD COLUMN IF NOT EXISTS "product_variant_id" INT DEFAULT NULL`
  );

  // Variants deleted by the WooCommerce importer (deleteStaleVariants) may have
  // left ids that point at nothing; clear them so the FK can be created.
  await execute(
    connection,
    `UPDATE "order_item" oi
     SET "product_variant_id" = NULL
     WHERE oi.product_variant_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "product_variant" v WHERE v.product_variant_id = oi.product_variant_id
       )`
  );

  for (const table of ['order_item', 'cart_item']) {
    const name = `FK_${table.toUpperCase()}_PRODUCT_VARIANT`;
    await execute(
      connection,
      `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`
    );
    await execute(
      connection,
      `ALTER TABLE "${table}"
       ADD CONSTRAINT "${name}"
       FOREIGN KEY ("product_variant_id")
       REFERENCES "product_variant" ("product_variant_id")
       ON DELETE SET NULL`
    );
    await execute(
      connection,
      `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" ("product_variant_id")`
    );
  }
};
