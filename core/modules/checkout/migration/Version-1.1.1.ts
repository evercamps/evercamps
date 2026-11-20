import { execute } from '@evershop/postgres-query-builder';

// ADR-0002: the legacy variant_group is gone, so cart and order items no
// longer carry a variant_group_id or the variant_options built from it. The
// variant is product_variant_id; its title (variantTitle) tells weeks apart.
export default async (connection: any) => {
  for (const table of ['cart_item', 'order_item']) {
    await execute(
      connection,
      `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "variant_group_id", DROP COLUMN IF EXISTS "variant_options"`
    );
  }
};
