import { getConfig } from '../../../lib/util/getConfig.js';
import { getSetting, refreshSetting } from '../../setting/services/setting.js';

export type SmtpSecurity = 'none' | 'starttls' | 'ssl';

export type SmtpSettings = {
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string;
};

export type EmailSettings = {
  sendingEnabled: boolean;
  transport: string;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  adminRecipients: string[];
  customerWelcomeEnabled: boolean;
  bodyRetentionDays: number;
  retentionDays: number;
  storeName: string;
  storeEmail: string;
  smtp: SmtpSettings;
};

type SmtpConfig = Partial<{
  host: string;
  port: number | string;
  security: SmtpSecurity;
  username: string;
  password: string;
}>;

export const DEFAULT_BODY_RETENTION_DAYS = 30;
export const DEFAULT_RETENTION_DAYS = 90;

function toInt(value: unknown, fallback: number): number {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value) === '1' || String(value).toLowerCase() === 'true';
}

function clampDays(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.min(value, 3650);
}

/**
 * SMTP settings: config (system.email.smtp) wins over the setting table, so
 * the password can stay out of the database.
 */
export async function getSmtpSettings(): Promise<SmtpSettings> {
  const config = getConfig<SmtpConfig>('system.email.smtp', {});
  const security = (config.security ||
    (await getSetting<string>('smtpSecurity', 'starttls'))) as SmtpSecurity;
  return {
    host: config.host || (await getSetting<string>('smtpHost', '')) || '',
    port: toInt(config.port ?? (await getSetting<string>('smtpPort', '587')), 587),
    security: ['none', 'starttls', 'ssl'].includes(security) ? security : 'starttls',
    username: config.username || (await getSetting<string>('smtpUsername', '')) || '',
    password: config.password || (await getSetting<string>('smtpPassword', '')) || ''
  };
}

/** True when the SMTP password comes from the config file */
export function isSmtpConfiguredInConfig(): boolean {
  const config = getConfig<SmtpConfig>('system.email.smtp', {});
  return Boolean(config.host);
}

/**
 * Reads all email settings. The setting cache is refreshed first, because the
 * event and cron processes would otherwise keep the values from their start.
 */
export async function getEmailSettings(refresh = true): Promise<EmailSettings> {
  if (refresh) {
    await refreshSetting();
  }
  const storeName = (await getSetting<string>('storeName', '')) || 'EverCamps Store';
  const storeEmail = (await getSetting<string>('storeEmail', '')) || '';
  const bodyRetentionDays = clampDays(
    toInt(
      await getSetting('emailLogBodyRetentionDays', DEFAULT_BODY_RETENTION_DAYS),
      DEFAULT_BODY_RETENTION_DAYS
    ),
    DEFAULT_BODY_RETENTION_DAYS
  );
  const retentionDays = Math.max(
    clampDays(
      toInt(await getSetting('emailLogRetentionDays', DEFAULT_RETENTION_DAYS), DEFAULT_RETENTION_DAYS),
      DEFAULT_RETENTION_DAYS
    ),
    bodyRetentionDays
  );
  const adminRecipients = String((await getSetting<string>('emailAdminRecipients', '')) || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    sendingEnabled: toBool(await getSetting('emailSendingEnabled', 0), false),
    transport: (await getSetting<string>('emailTransport', 'smtp')) || 'smtp',
    fromName: (await getSetting<string>('emailFromName', '')) || storeName,
    fromAddress: (await getSetting<string>('emailFromAddress', '')) || storeEmail,
    replyTo: (await getSetting<string>('emailReplyTo', '')) || '',
    adminRecipients,
    customerWelcomeEnabled: toBool(await getSetting('emailCustomerWelcomeEnabled', 1), true),
    bodyRetentionDays,
    retentionDays,
    storeName,
    storeEmail,
    smtp: await getSmtpSettings()
  };
}

export function getShopLanguage(): string {
  return getConfig<string>('shop.language', 'en') || 'en';
}
