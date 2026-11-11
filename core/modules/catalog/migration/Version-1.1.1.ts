import { execute } from '@evershop/postgres-query-builder';

// Default variant: every product gets (at most) one product_variant flagged
// is_default, so cart/order/registration code can always resolve a variant for
// products that don't have real variants.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "product_variant"
     ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false`
  );

  // DB-level guarantee: at most one default variant per product.
  await execute(
    connection,
    `CREATE UNIQUE INDEX IF NOT EXISTS "PRODUCT_VARIANT_ONE_DEFAULT"
     ON "product_variant" ("product_id")
     WHERE "is_default" = true`
  );

  // Products that already have exactly one variant (e.g. WooCommerce-imported
  // simple products, see importVariants.ts > variantInputFromSimpleProduct):
  // that variant becomes the default. Products with several real variants get
  // no default - a variant has to be chosen explicitly for those.
  await execute(
    connection,
    `UPDATE "product_variant" v
     SET "is_default" = true
     WHERE (SELECT count(*) FROM "product_variant" o WHERE o.product_id = v.product_id) = 1
       AND NOT EXISTS (
         SELECT 1 FROM "product_variant" d
         WHERE d.product_id = v.product_id AND d.is_default = true
       )`
  );

  // Products without any variant get a default one mirrored from the product.
  // product_variant.sku is globally unique, so fall back to "<sku>-<product_id>"
  // if the product's sku is already taken by another product's variant.
  await execute(
    connection,
    `INSERT INTO "product_variant" ("product_id", "sku", "price", "title", "is_default")
     SELECT p.product_id,
            CASE
              WHEN EXISTS (SELECT 1 FROM "product_variant" t WHERE t.sku = p.sku)
                THEN p.sku || '-' || p.product_id
              ELSE p.sku
            END,
            p.price,
            NULL,
            true
     FROM "product" p
     WHERE NOT EXISTS (
       SELECT 1 FROM "product_variant" v WHERE v.product_id = p.product_id
     )`
  );

  // Every default variant needs an inventory_item; seed seats from the
  // product's legacy inventory qty.
  await execute(
    connection,
    `INSERT INTO "inventory_item" ("variant_id", "total_seats")
     SELECT v.product_variant_id, COALESCE(pi.qty, 0)
     FROM "product_variant" v
     LEFT JOIN "product_inventory" pi ON pi.product_inventory_product_id = v.product_id
     WHERE v.is_default = true
       AND NOT EXISTS (
         SELECT 1 FROM "inventory_item" i WHERE i.variant_id = v.product_variant_id
       )`
  );
};
