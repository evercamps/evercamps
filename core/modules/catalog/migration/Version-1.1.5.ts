import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  // product.type is the stored product mode: 'simple' (one default variant,
  // edited through the product's own sku/price/qty) or 'configurable' (has its
  // own variants). Backfill it from the variants that exist today: more than
  // one variant, a variant with options, or a variant that isn't the default
  // means configurable.
  await execute(
    connection,
    `UPDATE "product" SET "type" = 'configurable'
     WHERE "type" = 'simple'
       AND (
         (SELECT COUNT(*) FROM "product_variant" pv
           WHERE pv."product_id" = "product"."product_id") > 1
         OR EXISTS (
           SELECT 1 FROM "product_variant" pv
           JOIN "variant_attribute_value" vav ON vav."variant_id" = pv."product_variant_id"
           WHERE pv."product_id" = "product"."product_id" AND vav."option_id" IS NOT NULL
         )
         OR EXISTS (
           SELECT 1 FROM "product_variant" pv
           WHERE pv."product_id" = "product"."product_id" AND pv."is_default" = false
         )
       )`
  );
};
