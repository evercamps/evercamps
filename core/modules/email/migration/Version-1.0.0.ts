import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "email_log" (
      "email_log_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "template_code" varchar NOT NULL,
      "recipient" varchar NOT NULL,
      "subject" text NOT NULL,
      "body_html" text DEFAULT NULL,
      "status" varchar NOT NULL DEFAULT 'queued',
      "transport" varchar DEFAULT NULL,
      "provider_message_id" varchar DEFAULT NULL,
      "error" text DEFAULT NULL,
      "attempts" INT NOT NULL DEFAULT 0,
      "entity_type" varchar DEFAULT NULL,
      "entity_id" INT DEFAULT NULL,
      "idempotency_key" varchar DEFAULT NULL,
      "sent_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "delivered_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "opened_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "clicked_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "open_count" INT NOT NULL DEFAULT 0,
      "click_count" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EMAIL_LOG_UUID_UNIQUE" UNIQUE ("uuid")
    )`
  );
  await execute(
    connection,
    `CREATE UNIQUE INDEX IF NOT EXISTS "EMAIL_LOG_IDEMPOTENCY_KEY_UNIQUE"
     ON "email_log" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "EMAIL_LOG_PROVIDER_MESSAGE_ID"
     ON "email_log" ("provider_message_id")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "EMAIL_LOG_ENTITY"
     ON "email_log" ("entity_type", "entity_id")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "EMAIL_LOG_CREATED_AT"
     ON "email_log" ("created_at")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "EMAIL_LOG_STATUS"
     ON "email_log" ("status")`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "email_log_event" (
      "email_log_event_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "email_log_id" INT NOT NULL,
      "event" varchar NOT NULL,
      "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "data" jsonb DEFAULT NULL,
      CONSTRAINT "FK_EMAIL_LOG_EVENT_LOG" FOREIGN KEY ("email_log_id")
        REFERENCES "email_log" ("email_log_id") ON DELETE CASCADE
    )`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "FK_EMAIL_LOG_EVENT_LOG"
     ON "email_log_event" ("email_log_id")`
  );

  // These events never had a subscriber, so every row since go-live is still
  // in the event table. Without this cleanup the first email subscriber would
  // mail all past customers. Migrations run before the event process starts.
  await execute(
    connection,
    `DELETE FROM "event"
     WHERE "name" IN ('order_placed', 'customer_registered', 'order_status_updated')`
  );
};
