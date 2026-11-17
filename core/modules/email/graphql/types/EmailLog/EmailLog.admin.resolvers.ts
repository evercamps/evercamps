import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getEmailTemplateDefinition, getEmailTemplates } from '../../../services/templates.js';

type Context = { pool: any };

type EmailLogRow = Record<string, any> & {
  email_log_id: number;
  uuid: string;
};

type Filters = {
  page?: number | null;
  limit?: number | null;
  status?: string | null;
  template?: string | null;
  recipient?: string | null;
};

function iso(value: unknown): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function toEmailLog(row: EmailLogRow) {
  return {
    uuid: row.uuid,
    templateCode: row.template_code,
    templateName: getEmailTemplateDefinition(row.template_code)?.name ?? row.template_code,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    transport: row.transport,
    providerMessageId: row.provider_message_id,
    error: row.error,
    attempts: row.attempts,
    entityType: row.entity_type,
    entityId: row.entity_id,
    hasBody: Boolean(row.body_html),
    bodyHtml: row.body_html,
    createdAt: iso(row.created_at),
    sentAt: iso(row.sent_at),
    deliveredAt: iso(row.delivered_at),
    openedAt: iso(row.opened_at),
    clickedAt: iso(row.clicked_at),
    openCount: row.open_count,
    clickCount: row.click_count,
    emailLogId: row.email_log_id
  };
}

export default {
  Query: {
    emailLogs: async (_: unknown, { filters }: { filters?: Filters }, { pool }: Context) => {
      const page = Math.max(1, Number(filters?.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(filters?.limit) || 30));
      const where: string[] = [];
      const values: unknown[] = [];
      if (filters?.status) {
        values.push(filters.status);
        where.push(`"status" = $${values.length}`);
      }
      if (filters?.template) {
        values.push(filters.template);
        where.push(`"template_code" = $${values.length}`);
      }
      if (filters?.recipient) {
        values.push(`%${filters.recipient}%`);
        where.push(`"recipient" ILIKE $${values.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const total = await pool.query(`SELECT COUNT(*)::int AS total FROM "email_log" ${whereSql}`, values);
      const rows = await pool.query(
        `SELECT * FROM "email_log" ${whereSql}
         ORDER BY "email_log_id" DESC
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        values
      );
      return {
        items: rows.rows.map(toEmailLog),
        total: total.rows[0]?.total ?? 0,
        page,
        limit,
        status: filters?.status || null,
        template: filters?.template || null,
        recipient: filters?.recipient || null
      };
    },
    emailLog: async (_: unknown, { uuid }: { uuid: string }, { pool }: Context) => {
      const row = await select().from('email_log').where('uuid', '=', uuid).load(pool);
      return row ? toEmailLog(row) : null;
    },
    emailTemplates: () => getEmailTemplates().map((t) => ({ code: t.code, name: t.name }))
  },
  EmailLog: {
    events: async ({ emailLogId }: { emailLogId: number }, _: unknown, { pool }: Context) => {
      const query = select().from('email_log_event');
      query.where('email_log_id', '=', emailLogId);
      query.orderBy('occurred_at', 'ASC');
      const rows = await query.execute(pool);
      return rows.map((r: any) => ({ event: r.event, occurredAt: iso(r.occurred_at), data: r.data }));
    },
    viewUrl: ({ uuid }: { uuid: string }) => buildUrl('emailLogView', { id: uuid }),
    resendApi: ({ uuid }: { uuid: string }) => buildUrl('resendEmail', { id: uuid }),
    orderUrl: async (
      { entityType, entityId }: { entityType: string | null; entityId: number | null },
      _: unknown,
      { pool }: Context
    ) => {
      if (entityType !== 'order' || !entityId) {
        return null;
      }
      const order = await select('uuid').from('order').where('order_id', '=', entityId).load(pool);
      return order ? buildUrl('orderEdit', { id: order.uuid }) : null;
    }
  },
  Order: {
    emailLogs: async ({ orderId }: { orderId: number }, _: unknown, { pool }: Context) => {
      const query = select().from('email_log');
      query.where('entity_type', '=', 'order').and('entity_id', '=', orderId);
      query.orderBy('email_log_id', 'DESC');
      const rows = await query.execute(pool);
      return rows.map(toEmailLog);
    },
    resendOrderConfirmationApi: ({ uuid }: { uuid: string }) =>
      buildUrl('resendOrderConfirmation', { id: uuid })
  }
};
