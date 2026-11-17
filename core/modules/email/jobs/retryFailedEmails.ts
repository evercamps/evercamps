import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getEmailSettings } from '../services/emailSettings.js';
import { deliverLogRow, EmailLogRow } from '../services/sendEmail.js';

const MAX_ATTEMPTS = 3;

/**
 * Every 15 minutes: send failed emails again (stored body, active transport),
 * at most 3 attempts and only within 24 hours. Subscribers have no retry.
 */
export default async function retryFailedEmails(): Promise<void> {
  try {
    const settings = await getEmailSettings();
    if (!settings.sendingEnabled) {
      return;
    }
    const { rows } = await pool.query(
      `SELECT * FROM "email_log"
       WHERE "status" = 'failed'
         AND "attempts" < $1
         AND "body_html" IS NOT NULL
         AND "created_at" > NOW() - INTERVAL '24 hours'
       ORDER BY "email_log_id" ASC
       LIMIT 50`,
      [MAX_ATTEMPTS]
    );
    for (const row of rows as EmailLogRow[]) {
      await deliverLogRow(row, settings);
    }
  } catch (e) {
    error(e);
  }
}
