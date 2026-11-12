import { execute } from '@evershop/postgres-query-builder';

// Orders (or single registrations without an order) that must not get a
// fiscal attest: e.g. the payer isn't Belgian, or an organisation booked it.
export default async (connection: any) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "fiscal_attest_exclusion" (
      "fiscal_attest_exclusion_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "order_id" INT NULL REFERENCES "order"("order_id") ON DELETE CASCADE,
      "registration_id" INT NULL REFERENCES "registration"("registration_id") ON DELETE CASCADE,
      "reason" VARCHAR(30) NOT NULL,          -- 'not_belgian' | 'organisation' | 'other'
      "note" TEXT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FISCAL_ATTEST_EXCLUSION_TARGET" CHECK (("order_id" IS NULL) <> ("registration_id" IS NULL)),
      CONSTRAINT "FISCAL_ATTEST_EXCLUSION_ORDER_UNIQUE" UNIQUE ("order_id"),
      CONSTRAINT "FISCAL_ATTEST_EXCLUSION_REGISTRATION_UNIQUE" UNIQUE ("registration_id")
    )`
  );
};
