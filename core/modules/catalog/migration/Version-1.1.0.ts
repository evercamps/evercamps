import { execute } from '@evershop/postgres-query-builder';

export default async (connection : any) => {
  await execute(
    connection,
    `ALTER TABLE "inventory_item"
     DROP CONSTRAINT IF EXISTS "UNSIGNED_TOTAL_SEATS"`
  );
};
