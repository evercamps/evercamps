import type { Setting } from '../../../../setting/services/setting.js';
import { DEFAULT_RETENTION_DAYS } from '../../../services/contactSettings.js';
import type {
  ContactMessage,
  ContactMessageCollection,
  ContactMessageFilters,
  ContactMessageRow
} from '../../../types/index.js';

type Context = { pool: any };

type ContactMessagesArgs = {
  filters?: { [K in keyof ContactMessageFilters]?: ContactMessageFilters[K] | null } | null;
};

function value(setting: Setting[], name: string): string | null {
  const row = setting.find((s) => s.name === name);
  return row && row.value !== null && row.value !== undefined ? String(row.value) : null;
}

function iso(date: unknown): string | null {
  if (!date) {
    return null;
  }
  const parsed = date instanceof Date ? date : new Date(String(date));
  return Number.isNaN(parsed.getTime()) ? String(date) : parsed.toISOString();
}

function toContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    uuid: row.uuid,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    createdAt: iso(row.created_at)
  };
}

export default {
  Query: {
    contactMessages: async (
      _: unknown,
      { filters }: ContactMessagesArgs,
      { pool }: Context
    ): Promise<ContactMessageCollection> => {
      const page = Math.max(1, Number(filters?.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(filters?.limit) || 30));
      const search = filters?.search?.trim() || null;
      const values: unknown[] = [];
      let whereSql = '';
      if (search) {
        values.push(`%${search}%`);
        whereSql = `WHERE "name" ILIKE $1 OR "email" ILIKE $1 OR "message" ILIKE $1`;
      }
      const total = await pool.query(
        `SELECT COUNT(*)::int AS total FROM "contact_message" ${whereSql}`,
        values
      );
      const rows = await pool.query(
        `SELECT * FROM "contact_message" ${whereSql}
         ORDER BY "contact_message_id" DESC
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        values
      );
      return {
        items: (rows.rows as ContactMessageRow[]).map(toContactMessage),
        total: total.rows[0]?.total || 0,
        page,
        limit,
        search
      };
    }
  },
  Setting: {
    contactFormRecipient: (s: Setting[]) => value(s, 'contactFormRecipient'),
    contactMessageRetentionDays: (s: Setting[]): number => {
      const parsed = parseInt(value(s, 'contactMessageRetentionDays') ?? '', 10);
      return Number.isNaN(parsed) ? DEFAULT_RETENTION_DAYS : parsed;
    }
  }
};
