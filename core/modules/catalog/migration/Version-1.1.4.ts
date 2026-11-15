import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  // An attribute option can be made inactive (e.g. a camp week of a past
  // season). It stays, with the variants and product values that use it, but
  // the admin pickers hide it by default.
  await execute(
    connection,
    `ALTER TABLE "attribute_option"
     ADD COLUMN IF NOT EXISTS "status" boolean NOT NULL DEFAULT true`
  );
};
