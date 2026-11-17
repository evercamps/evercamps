import { error, info } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getEmailSettings } from '../services/emailSettings.js';

/**
 * Daily: clear the stored body of old log rows, then delete rows older than
 * the retention (events cascade).
 */
export default async function purgeEmailLog(): Promise<void> {
  try {
    const settings = await getEmailSettings();
    const cleared = await pool.query(
      `UPDATE "email_log" SET "body_html" = NULL, "updated_at" = NOW()
       WHERE "body_html" IS NOT NULL
         AND "created_at" < NOW() - make_interval(days => $1)`,
      [settings.bodyRetentionDays]
    );
    const deleted = await pool.query(
      `DELETE FROM "email_log" WHERE "created_at" < NOW() - make_interval(days => $1)`,
      [settings.retentionDays]
    );
    if ((cleared.rowCount || 0) > 0 || (deleted.rowCount || 0) > 0) {
      info(`Email log purge: ${cleared.rowCount} bodies cleared, ${deleted.rowCount} rows deleted`);
    }
  } catch (e) {
    error(e);
  }
}
