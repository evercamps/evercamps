import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "woocommerce_image_map" (
      "woocommerce_image_map_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "external_image_src" text NOT NULL,
      "local_url" text NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WC_IMAGE_MAP_EXTERNAL_SRC_UNIQUE" UNIQUE ("external_image_src")
    )`
  );
};
