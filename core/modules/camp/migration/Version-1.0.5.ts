import { execute } from '@evershop/postgres-query-builder';

// The participant's membership number (ADR-0006). Filled from the
// registration's extra data when an order is placed, if still empty
// (orderCreator, like birth_date); the organiser checks and corrects it.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "participant"
     ADD COLUMN IF NOT EXISTS "membership_number" varchar DEFAULT NULL`
  );
};
