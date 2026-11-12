import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  // A variant can be disabled on its own (e.g. a camp week that no longer
  // runs): it stays, with its registrations, but isn't bookable in the shop.
  await execute(
    connection,
    `ALTER TABLE "product_variant"
     ADD COLUMN IF NOT EXISTS "status" boolean NOT NULL DEFAULT true`
  );

  // New attribute type "period": a select whose options are periods with a
  // start and end date (camp weeks). The plain "select" type is then for
  // normal choices again. The camp-week attribute(s) become "period".
  // (Options without dates stay allowed, so existing data keeps working; the
  // attribute editor asks for dates on new options and the fiscal attests
  // page flags the missing ones.)
  await execute(
    connection,
    `UPDATE "attribute" SET "type" = 'period'
     WHERE "attribute_code" IN ('kampweek', 'pa_kampweek') AND "type" = 'select'`
  );
};
