import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "product_variant"
     ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT FALSE`
  );

  await execute(
    connection,
    `CREATE UNIQUE INDEX "PRODUCT_VARIANT_ONE_DEFAULT"
     ON "product_variant" ("product_id")
     WHERE "is_default" = TRUE`
  );

  // Create a default variant for every product that currently has no variants.
  await execute(
    connection,
    `
    INSERT INTO "product_variant" (
      "product_id",
      "sku",
      "price",
      "title",
      "is_default"
    )
    SELECT
      p."product_id",
      p."sku",
      p."price",
      NULL,
      TRUE
    FROM "product" p
    WHERE NOT EXISTS (
      SELECT 1
      FROM "product_variant" pv
      WHERE pv."product_id" = p."product_id"
    )
    `
  );

  // Create inventory_item for every default variant created above.
  await execute(
    connection,
    `
    INSERT INTO "inventory_item" (
      "variant_id",
      "total_seats"
    )
    SELECT
      pv."product_variant_id",
      COALESCE(pi."qty", 0)
    FROM "product_variant" pv
    LEFT JOIN "product_inventory" pi
      ON pi."product_inventory_product_id" = pv."product_id"
    WHERE pv."is_default" = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM "inventory_item" ii
        WHERE ii."variant_id" = pv."product_variant_id"
      )
    `
  );
};