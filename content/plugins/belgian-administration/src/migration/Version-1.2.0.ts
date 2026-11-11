import { execute } from '@evershop/postgres-query-builder';

// Fiscal attests 281.86 + Belcotax batches (core/.docs/fiscal-attests.md, 1d).
export default async (connection: any) => {
  // One Belcotax upload: an XML with original fiches, or corrections/cancellations.
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "fiscal_attest_batch" (
      "fiscal_attest_batch_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "income_year" SMALLINT NOT NULL,
      "kind" VARCHAR(20) NOT NULL,             -- 'original' | 'correction' | 'cancellation'
      "status" VARCHAR(20) NOT NULL,           -- 'exported' | 'submitted' | 'accepted' | 'rejected'
      "xml_file" TEXT NULL,
      "belcotax_reference" VARCHAR(100) NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "submitted_at" TIMESTAMP WITH TIME ZONE NULL,
      CONSTRAINT "FISCAL_ATTEST_BATCH_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FISCAL_ATTEST_BATCH_KIND" CHECK ("kind" IN ('original', 'correction', 'cancellation')),
      CONSTRAINT "FISCAL_ATTEST_BATCH_STATUS" CHECK ("status" IN ('exported', 'submitted', 'accepted', 'rejected'))
    )`
  );

  // One attest per child per payer per year. `data` is the full snapshot the
  // PDF, the XML and corrections are built from.
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "fiscal_attest" (
      "fiscal_attest_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "income_year" SMALLINT NOT NULL,
      "sequence_number" INT NOT NULL,          -- fiche number, needed for corrections
      "participant_id" INT NULL REFERENCES "participant"("participant_id") ON DELETE SET NULL,
      "customer_id" INT NULL REFERENCES "customer"("customer_id") ON DELETE SET NULL,
      "batch_id" INT NULL REFERENCES "fiscal_attest_batch"("fiscal_attest_batch_id") ON DELETE SET NULL,
      "status" VARCHAR(20) NOT NULL,           -- 'final' | 'corrected' | 'cancelled'
      "replaces_attest_id" INT NULL REFERENCES "fiscal_attest"("fiscal_attest_id") ON DELETE SET NULL,
      "data" JSONB NOT NULL,
      "total_amount" NUMERIC(12,2) NOT NULL,
      "total_days" INT NOT NULL,
      "pdf_path" TEXT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FISCAL_ATTEST_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FISCAL_ATTEST_STATUS" CHECK ("status" IN ('final', 'corrected', 'cancelled'))
    )`
  );
  // A correction keeps its fiche number, so (year, sequence) is only unique
  // among the attests that are still current.
  await execute(
    connection,
    `CREATE UNIQUE INDEX IF NOT EXISTS "FISCAL_ATTEST_CURRENT_SEQUENCE"
     ON "fiscal_attest" ("income_year", "sequence_number")
     WHERE "status" = 'final'`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FISCAL_ATTEST_PARTICIPANT" ON "fiscal_attest" ("participant_id")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FISCAL_ATTEST_CUSTOMER" ON "fiscal_attest" ("customer_id")`
  );

  // Manual amount for a registration (imported/historic data, special prices).
  // Takes precedence over the amount derived from order_item.
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "fiscal_attest_amount_override" (
      "registration_id" INT PRIMARY KEY REFERENCES "registration"("registration_id") ON DELETE CASCADE,
      "amount" NUMERIC(12,2) NOT NULL CHECK ("amount" >= 0),
      "note" TEXT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Who pays which share of a registration. No rows = 100% the order customer.
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "fiscal_attest_payer" (
      "fiscal_attest_payer_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "registration_id" INT NOT NULL REFERENCES "registration"("registration_id") ON DELETE CASCADE,
      "customer_id" INT NULL REFERENCES "customer"("customer_id") ON DELETE SET NULL,
      "full_name" VARCHAR(255) NOT NULL,
      "national_number" VARCHAR(11) NULL,
      "address" JSONB NOT NULL,               -- { street, postcode, city, country }
      "share_percent" NUMERIC(5,2) NOT NULL CHECK ("share_percent" > 0 AND "share_percent" <= 100),
      "source" VARCHAR(20) NOT NULL,          -- 'customer' | 'admin'
      "status" VARCHAR(20) NOT NULL,          -- 'active' | 'requested'
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FISCAL_ATTEST_PAYER_SOURCE" CHECK ("source" IN ('customer', 'admin')),
      CONSTRAINT "FISCAL_ATTEST_PAYER_STATUS" CHECK ("status" IN ('active', 'requested'))
    )`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FISCAL_ATTEST_PAYER_REGISTRATION" ON "fiscal_attest_payer" ("registration_id")`
  );
};
