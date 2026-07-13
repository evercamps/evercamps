import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  await execute(
    connection,
    `ALTER TABLE admin_user
    ADD COLUMN IF NOT EXISTS twofa_enabled boolean NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS twofa_secret varchar NULL,
    ADD COLUMN IF NOT EXISTS twofa_deadline timestamp NULL`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "admin_user_recovery_codes" (
    "recovery_code_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    "admin_user_id" INT NOT NULL REFERENCES "admin_user"("admin_user_id") ON DELETE CASCADE,
    "code_hash" VARCHAR NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`
  );
};
