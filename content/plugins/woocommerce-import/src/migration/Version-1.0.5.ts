import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

// Manual mapping of a WooCommerce order line name to a local product variant
// (admin page "Unmapped order lines", services/lineNameMap.ts). Used for order
// lines the import can't resolve by id: the WooCommerce product or variation
// was deleted, so WooCommerce sends product_id = 0 / an unknown variation.
// The order import reads it too, so a re-import keeps the chosen variant.
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "woocommerce_line_name_map" (
      "woocommerce_line_name_map_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "product_name" text NOT NULL,
      "product_id" INT NOT NULL REFERENCES "product"("product_id") ON DELETE CASCADE,
      "product_variant_id" INT NOT NULL REFERENCES "product_variant"("product_variant_id") ON DELETE CASCADE,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WC_LINE_NAME_MAP_NAME_UNIQUE" UNIQUE ("product_name")
    )`
  );
};
