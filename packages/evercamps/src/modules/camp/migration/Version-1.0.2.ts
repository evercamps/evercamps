import { execute } from "@evershop/postgres-query-builder";

export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE participant ADD COLUMN IF NOT EXISTS birth_date DATE NULL;`
  );
};
