import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  // Per-email reply-to (e.g. the visitor of the contact form). Stored on the
  // row so retries and resends keep it. NULL means: use the global setting.
  await execute(
    connection,
    `ALTER TABLE "email_log" ADD COLUMN IF NOT EXISTS "reply_to" varchar DEFAULT NULL`
  );
};
