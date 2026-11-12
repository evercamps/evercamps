import { execute } from '@evershop/postgres-query-builder';

// The payer's national number asked at checkout (one per order), kept on the
// cart until the order is placed - for guests there is no customer row to
// keep it on. Saved on the customer too when logged in.
export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE "cart"
     ADD COLUMN IF NOT EXISTS "payer_national_number" varchar DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS "payer_national_number_not_applicable" boolean NOT NULL DEFAULT false`
  );
};
