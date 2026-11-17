import { insert, select } from '@evershop/postgres-query-builder';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import type { EmailEventName } from '../types.js';

export type RecordEmailEventInput = {
  logUuid?: string | null;
  providerMessageId?: string | null;
  event: EmailEventName;
  occurredAt?: Date;
  data?: Record<string, any> | null;
};

const STATUS_BY_EVENT: Partial<Record<EmailEventName, string>> = {
  hard_bounce: 'bounced',
  soft_bounce: 'bounced',
  spam: 'spam',
  blocked: 'blocked',
  invalid: 'bounced',
  error: 'failed'
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Store a provider event (delivered, opened, clicked, bounce, ...) on its log
 * row. Used by tracking transports such as the Brevo plugin. Opens and clicks
 * never change the status, so the status stays a delivery status.
 * Returns false when no matching log row was found.
 */
export async function recordEmailEvent(input: RecordEmailEventInput): Promise<boolean> {
  try {
    let row: { email_log_id: number; status: string } | null = null;
    if (input.logUuid && UUID_PATTERN.test(input.logUuid)) {
      row = await select('email_log_id', 'status')
        .from('email_log')
        .where('uuid', '=', input.logUuid)
        .load(pool);
    }
    if (!row && input.providerMessageId) {
      row = await select('email_log_id', 'status')
        .from('email_log')
        .where('provider_message_id', '=', input.providerMessageId)
        .load(pool);
    }
    if (!row) {
      return false;
    }

    const occurredAt = input.occurredAt || new Date();
    await insert('email_log_event')
      .given({
        email_log_id: row.email_log_id,
        event: input.event,
        occurred_at: occurredAt,
        data: input.data ? JSON.stringify(input.data) : null
      })
      .execute(pool);

    const id = row.email_log_id;
    switch (input.event) {
      case 'delivered':
        await pool.query(
            `UPDATE "email_log"
           SET "delivered_at" = COALESCE("delivered_at", $1::timestamptz),
               "status" = CASE WHEN "status" = 'sent' THEN 'delivered' ELSE "status" END,
               "updated_at" = NOW()
           WHERE "email_log_id" = $2`,
          [occurredAt, id]
        );
        break;
      case 'opened':
        await pool.query(
            `UPDATE "email_log"
           SET "opened_at" = COALESCE("opened_at", $1::timestamptz),
               "open_count" = "open_count" + 1,
               "updated_at" = NOW()
           WHERE "email_log_id" = $2`,
          [occurredAt, id]
        );
        break;
      case 'clicked':
        await pool.query(
            `UPDATE "email_log"
           SET "clicked_at" = COALESCE("clicked_at", $1::timestamptz),
               "click_count" = "click_count" + 1,
               "updated_at" = NOW()
           WHERE "email_log_id" = $2`,
          [occurredAt, id]
        );
        break;
      default: {
        const status = STATUS_BY_EVENT[input.event];
        if (status) {
          await pool.query(
            `UPDATE "email_log" SET "status" = $1, "updated_at" = NOW() WHERE "email_log_id" = $2`,
            [status, id]
          );
        }
      }
    }
    return true;
  } catch (e) {
    error(e);
    return false;
  }
}
