import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

// One evercamps product per camp type. WooCommerce has a product per year
// ("Golfsurfen-watersporten-omnisport 2022", "... 2023"); they are merged into
// one product ("Golfsurfen-watersporten-omnisport") whose kampweek options
// carry the year ("Week 1 zomer 2022"). See lib/season.ts / lib/campProducts.ts.
export default async (connection: PoolClient): Promise<void> => {
  // camp_key = slug of the product name without its year.
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "woocommerce_camp_product" (
      "woocommerce_camp_product_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "camp_key" varchar NOT NULL,
      "product_id" INT NOT NULL REFERENCES "product"("product_id") ON DELETE CASCADE,
      "latest_year" INT DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WC_CAMP_PRODUCT_KEY_UNIQUE" UNIQUE ("camp_key")
    )`
  );

  // Year from the WooCommerce product name; decides the season of its
  // variations and order lines. Several map rows can now share a product_id.
  await execute(
    connection,
    `ALTER TABLE "woocommerce_product_map"
     ADD COLUMN IF NOT EXISTS "external_year" INT DEFAULT NULL`
  );

  // The WooCommerce product a variation belongs to, so stale-variant cleanup
  // only touches that WooCommerce product's variations (a merged product has
  // the variations of several WooCommerce products).
  await execute(
    connection,
    `ALTER TABLE "woocommerce_variation_map"
     ADD COLUMN IF NOT EXISTS "external_product_id" INT DEFAULT NULL`
  );
};
