import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

/**
 * Value processor for the camp merge tool's `participantMergeBeforeDelete`
 * (called inside the merge transaction, right before the duplicate
 * participant row is deleted):
 * - fiscal attests of the duplicate move to the survivor (otherwise the
 *   participant_id FK would set them to NULL);
 * - the survivor gets the duplicate's national number when it has none.
 * Registrations (and with them fiscal_attest_payer / amount overrides) are
 * already moved by the merge tool itself.
 */
export async function moveFiscalDataOnMerge(
  value: { survivorId: number; duplicateId: number },
  context: { connection: PoolClient }
): Promise<{ survivorId: number; duplicateId: number }> {
  const survivorId = Number(value.survivorId);
  const duplicateId = Number(value.duplicateId);
  const { connection } = context;
  if (!survivorId || !duplicateId || !connection) {
    return value;
  }

  await execute(
    connection,
    `UPDATE "fiscal_attest" SET "participant_id" = ${survivorId}
     WHERE "participant_id" = ${duplicateId}`
  );
  await execute(
    connection,
    `UPDATE "participant" s
     SET "national_number" = d."national_number",
         "national_number_not_applicable" = false
     FROM "participant" d
     WHERE s.participant_id = ${survivorId}
       AND d.participant_id = ${duplicateId}
       AND (s."national_number" IS NULL OR s."national_number" = '')
       AND d."national_number" IS NOT NULL AND d."national_number" <> ''`
  );
  return value;
}
