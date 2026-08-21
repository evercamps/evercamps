import { execute } from "@evershop/postgres-query-builder";

export default async (connection: any) => {  
  await execute(
    connection,
    `ALTER TABLE "registration"
     ADD COLUMN IF NOT EXISTS "product_variant_id" INT DEFAULT NULL`
  );
};
