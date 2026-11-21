import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "contact_message" (
      "contact_message_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "name" varchar NOT NULL,
      "email" varchar NOT NULL,
      "phone" varchar DEFAULT NULL,
      "message" text NOT NULL,
      "ip_hash" varchar NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CONTACT_MESSAGE_UUID_UNIQUE" UNIQUE ("uuid")
    )`
  );
  // Rate limit lookups: messages from one IP in the last hour
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "CONTACT_MESSAGE_IP_HASH_CREATED_AT"
     ON "contact_message" ("ip_hash", "created_at")`
  );
  // Retention purge
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "CONTACT_MESSAGE_CREATED_AT"
     ON "contact_message" ("created_at")`
  );
};
