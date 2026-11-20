import { execute } from '@evershop/postgres-query-builder';

// ADR-0002: the legacy variant_group is gone, so cart and order items no
// longer carry a variant_group_id. The variant is product_variant_id.
export default async (connection: any) => {
  await execute(connection, `ALTER TABLE "cart_item" DROP COLUMN IF EXISTS "variant_group_id"`);
  await execute(connection, `ALTER TABLE "order_item" DROP COLUMN IF EXISTS "variant_group_id"`);
};
