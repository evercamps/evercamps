import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "participant" ADD COLUMN IF NOT EXISTS "national_number" varchar DEFAULT NULL`
  );
  await execute(
    connection,
    `ALTER TABLE "participant" ADD COLUMN IF NOT EXISTS "national_number_not_applicable" boolean NOT NULL DEFAULT FALSE`
  );
};
