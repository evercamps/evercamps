import { insert, select, update } from '@evershop/postgres-query-builder';
import { error, warning } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import type { EmailEntity, SendEmailInput, SendEmailResult } from '../types.js';
import { EmailSettings, getEmailSettings, getShopLanguage } from './emailSettings.js';
import { htmlToText, renderEmail } from './renderTemplate.js';
import { getEmailTemplate } from './templates.js';
import { getTransport } from './transports.js';

export type EmailLogRow = {
  email_log_id: number;
  uuid: string;
  template_code: string;
  recipient: string;
  subject: string;
  body_html: string | null;
  status: string;
  transport: string | null;
  attempts: number;
  entity_type: string | null;
  entity_id: number | null;
  idempotency_key: string | null;
  reply_to: string | null;
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Deliver an existing log row with the active transport and store the result.
 * Never throws.
 */
export async function deliverLogRow(
  row: EmailLogRow,
  settings?: EmailSettings
): Promise<SendEmailResult> {
  try {
    const emailSettings = settings || (await getEmailSettings());
    if (!emailSettings.sendingEnabled) {
      await update('email_log')
        .given({ status: 'skipped', error: 'Email sending is disabled', updated_at: new Date() })
        .where('email_log_id', '=', row.email_log_id)
        .execute(pool);
      return { status: 'skipped', logUuid: row.uuid };
    }

    const transport = getTransport(emailSettings.transport);
    if (!transport || !(await transport.isConfigured())) {
      const message = 'No email transport configured';
      await update('email_log')
        .given({
          status: 'failed',
          error: message,
          transport: transport?.code ?? null,
          attempts: (row.attempts || 0) + 1,
          updated_at: new Date()
        })
        .where('email_log_id', '=', row.email_log_id)
        .execute(pool);
      return { status: 'failed', logUuid: row.uuid, error: message };
    }

    if (!emailSettings.fromAddress) {
      const message = 'No sender address: set a from address or the store email';
      await update('email_log')
        .given({
          status: 'failed',
          error: message,
          transport: transport.code,
          attempts: (row.attempts || 0) + 1,
          updated_at: new Date()
        })
        .where('email_log_id', '=', row.email_log_id)
        .execute(pool);
      return { status: 'failed', logUuid: row.uuid, error: message };
    }

    try {
      const html = row.body_html || '';
      const result = await transport.send({
        logUuid: row.uuid,
        templateCode: row.template_code,
        from: { name: emailSettings.fromName, email: emailSettings.fromAddress },
        replyTo: row.reply_to || emailSettings.replyTo || undefined,
        to: row.recipient,
        subject: row.subject,
        html,
        text: htmlToText(html)
      });
      await update('email_log')
        .given({
          status: 'sent',
          error: null,
          transport: transport.code,
          provider_message_id: result.providerMessageId ?? null,
          attempts: (row.attempts || 0) + 1,
          sent_at: new Date(),
          updated_at: new Date()
        })
        .where('email_log_id', '=', row.email_log_id)
        .execute(pool);
      return { status: 'sent', logUuid: row.uuid };
    } catch (e) {
      const message = errorMessage(e);
      error(`Email ${row.template_code} to ${row.recipient} failed: ${message}`);
      await update('email_log')
        .given({
          status: 'failed',
          error: message,
          transport: transport.code,
          attempts: (row.attempts || 0) + 1,
          updated_at: new Date()
        })
        .where('email_log_id', '=', row.email_log_id)
        .execute(pool);
      return { status: 'failed', logUuid: row.uuid, error: message };
    }
  } catch (e) {
    error(e);
    return { status: 'failed', logUuid: row.uuid, error: errorMessage(e) };
  }
}

async function findByIdempotencyKey(key: string): Promise<EmailLogRow | null> {
  return (await select()
    .from('email_log')
    .where('idempotency_key', '=', key)
    .load(pool)) as EmailLogRow | null;
}

/**
 * Insert a log row. When the idempotency key already exists (sent before, or a
 * concurrent send), the existing row is returned with `duplicate: true`.
 */
async function insertLogRow(values: Record<string, any>): Promise<{ row: EmailLogRow; duplicate: boolean }> {
  try {
    const row = (await insert('email_log').given(values).execute(pool)) as EmailLogRow;
    return { row, duplicate: false };
  } catch (e) {
    if (values.idempotency_key) {
      const existing = await findByIdempotencyKey(values.idempotency_key);
      if (existing) {
        return { row: existing, duplicate: true };
      }
    }
    throw e;
  }
}

/**
 * Render a code template and send it. Every attempt is logged in email_log,
 * also when sending is disabled (`skipped`) or fails. Never throws: a failed
 * email must not break checkout or the password reset.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const settings = await getEmailSettings();
    const language = input.language || getShopLanguage();
    const content = getEmailTemplate(input.template, language);
    if (!content) {
      warning(`Email template ${input.template} is not registered`);
      return { status: 'failed', error: `Unknown email template ${input.template}` };
    }

    if (input.idempotencyKey) {
      const existing = await findByIdempotencyKey(input.idempotencyKey);
      if (existing && existing.status !== 'failed' && existing.status !== 'skipped') {
        return { status: 'duplicate', logUuid: existing.uuid };
      }
      if (existing) {
        // Earlier attempt failed or was skipped: try again with the same row.
        return deliverLogRow(existing, settings);
      }
    }

    const rendered = renderEmail(
      content,
      {
        store: { name: settings.storeName, email: settings.storeEmail },
        ...input.data
      },
      { storeName: settings.storeName, storeEmail: settings.storeEmail, language: content.language }
    );
    if (rendered.missing.length > 0) {
      warning(`Email ${input.template}: no value for ${rendered.missing.join(', ')}`);
    }

    const entity: EmailEntity | undefined = input.entity;
    const { row, duplicate } = await insertLogRow({
      template_code: input.template,
      recipient: input.to,
      subject: rendered.subject,
      body_html: rendered.html,
      status: 'queued',
      entity_type: entity?.type ?? null,
      entity_id: entity?.id ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      reply_to: input.replyTo || null
    });
    if (duplicate) {
      return { status: 'duplicate', logUuid: row.uuid };
    }
    return deliverLogRow(row, settings);
  } catch (e) {
    error(e);
    return { status: 'failed', error: errorMessage(e) };
  }
}

/** Log an email that was not sent, e.g. because there is no recipient */
export async function logSkippedEmail(
  template: string,
  recipient: string,
  reason: string,
  entity?: EmailEntity
): Promise<void> {
  try {
    await insert('email_log')
      .given({
        template_code: template,
        recipient: recipient || '-',
        subject: '-',
        body_html: null,
        status: 'skipped',
        error: reason,
        entity_type: entity?.type ?? null,
        entity_id: entity?.id ?? null
      })
      .execute(pool);
  } catch (e) {
    error(e);
  }
}

/**
 * Send a logged email again (new log row, same subject and body). Returns null
 * when the row doesn't exist or its body was already removed.
 */
export async function resendLoggedEmail(uuid: string): Promise<SendEmailResult | null> {
  const original = (await select()
    .from('email_log')
    .where('uuid', '=', uuid)
    .load(pool)) as EmailLogRow | null;
  if (!original || !original.body_html) {
    return null;
  }
  const row = (await insert('email_log')
    .given({
      template_code: original.template_code,
      recipient: original.recipient,
      subject: original.subject,
      body_html: original.body_html,
      status: 'queued',
      entity_type: original.entity_type,
      entity_id: original.entity_id,
      reply_to: original.reply_to
    })
    .execute(pool)) as EmailLogRow;
  return deliverLogRow(row);
}
