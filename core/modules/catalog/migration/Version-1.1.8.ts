import { execute } from '@evershop/postgres-query-builder';

// Member price on the product (#209): what a new variant starts with, and what
// a simple product mirrors into its default variant (like `price`). The cart
// only reads product_variant.member_price; NULL = no member price.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "product"
     ADD COLUMN IF NOT EXISTS "member_price" decimal(12,4) DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE "product"
     DROP CONSTRAINT IF EXISTS "UNSIGNED_PRODUCT_MEMBER_PRICE"`
  );
  await execute(
    connection,
    `ALTER TABLE "product"
     ADD CONSTRAINT "UNSIGNED_PRODUCT_MEMBER_PRICE"
     CHECK ("member_price" IS NULL OR "member_price" >= 0)`
  );
};
