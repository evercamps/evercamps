import { execute } from '@evershop/postgres-query-builder';

// Belcotax fiche type per attest row (core/.docs/fiscal-attests.md, Phase 5/6).
//   original     - first upload of the year (f2028 = 0)
//   modification - replaces an exported fiche, same volgnummer (f2028 = 1)
//   addition     - new fiche after the original upload (f2028 = 2)
//   cancellation - cancels an exported fiche, same volgnummer (f2028 = 3);
//                  stored as a row with status 'cancelled'
// A row with batch_id NULL still has to be exported.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "fiscal_attest"
     ADD COLUMN IF NOT EXISTS "change_type" VARCHAR(20) NOT NULL DEFAULT 'original'`
  );
  await execute(
    connection,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FISCAL_ATTEST_CHANGE_TYPE') THEN
         ALTER TABLE "fiscal_attest" ADD CONSTRAINT "FISCAL_ATTEST_CHANGE_TYPE"
           CHECK ("change_type" IN ('original', 'modification', 'addition', 'cancellation'));
       END IF;
     END $$`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FISCAL_ATTEST_YEAR_BATCH" ON "fiscal_attest" ("income_year", "batch_id")`
  );
};
