import { execute } from '@evershop/postgres-query-builder';

// Care dates per attribute option, e.g. the "period" option "Week 1 zomer"
// = 6-10 July. Used for display/sorting and by the fiscal attests
// (core/.docs/fiscal-attests.md, 1b). value_date / value_int (Version-1.0.9)
// are left untouched.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "attribute_option"
     ADD COLUMN IF NOT EXISTS "start_date" DATE DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS "end_date" DATE DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS "day_count" INT DEFAULT NULL`
  );

  await execute(
    connection,
    `ALTER TABLE "attribute_option"
     DROP CONSTRAINT IF EXISTS "ATTRIBUTE_OPTION_DATE_RANGE"`
  );
  await execute(
    connection,
    `ALTER TABLE "attribute_option"
     ADD CONSTRAINT "ATTRIBUTE_OPTION_DATE_RANGE"
     CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "end_date" >= "start_date")`
  );

  await execute(
    connection,
    `ALTER TABLE "attribute_option"
     DROP CONSTRAINT IF EXISTS "ATTRIBUTE_OPTION_POSITIVE_DAY_COUNT"`
  );
  await execute(
    connection,
    `ALTER TABLE "attribute_option"
     ADD CONSTRAINT "ATTRIBUTE_OPTION_POSITIVE_DAY_COUNT"
     CHECK ("day_count" IS NULL OR "day_count" > 0)`
  );
};
