import { execute } from '@evershop/postgres-query-builder';

// Member price (ADR-0006): the price of a variant for a registration with a
// membership number. NULL = no member price, everyone pays `price`.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "product_variant"
     ADD COLUMN IF NOT EXISTS "member_price" decimal(12,4) DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE "product_variant"
     DROP CONSTRAINT IF EXISTS "UNSIGNED_PRODUCT_VARIANT_MEMBER_PRICE"`
  );
  await execute(
    connection,
    `ALTER TABLE "product_variant"
     ADD CONSTRAINT "UNSIGNED_PRODUCT_VARIANT_MEMBER_PRICE"
     CHECK ("member_price" IS NULL OR "member_price" >= 0)`
  );
};
