import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "woocommerce_variation_map" (
      "woocommerce_variation_map_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "external_variation_id" INT NOT NULL,
      "product_variant_id" INT DEFAULT NULL REFERENCES "product_variant"("product_variant_id") ON DELETE CASCADE,
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
};
