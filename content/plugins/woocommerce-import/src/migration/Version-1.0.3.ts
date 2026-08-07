import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "woocommerce_variation_map" (
      "woocommerce_variation_map_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "external_parent_product_id" INT NOT NULL,
      "external_variation_id" INT NOT NULL,
      "product_id" INT DEFAULT NULL REFERENCES "product"("product_id") ON DELETE CASCADE,
      "variant_group_id" INT DEFAULT NULL REFERENCES "variant_group"("variant_group_id") ON DELETE SET NULL,
      "created_in_batch_id" INT NOT NULL REFERENCES "woocommerce_import_batch"("woocommerce_import_batch_id"),
      "last_batch_id" INT NOT NULL REFERENCES "woocommerce_import_batch"("woocommerce_import_batch_id"),
      "status" varchar NOT NULL DEFAULT 'success',
      "error_message" text DEFAULT NULL,
      "external_updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WC_VARIATION_MAP_EXTERNAL_ID_UNIQUE" UNIQUE ("external_variation_id")
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "WC_VARIATION_MAP_PARENT_IDX" ON "woocommerce_variation_map" ("external_parent_product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "woocommerce_attribute_group_map" (
      "woocommerce_attribute_group_map_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "attribute_set_key" text NOT NULL,
      "attribute_group_id" INT NOT NULL REFERENCES "attribute_group"("attribute_group_id") ON DELETE CASCADE,
      CONSTRAINT "WC_ATTRIBUTE_GROUP_MAP_KEY_UNIQUE" UNIQUE ("attribute_set_key")
    )`
  );
};
