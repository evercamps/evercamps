import type { Setting } from '../../../../setting/services/setting.js';
import {
  DEFAULT_BODY_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
  isSmtpConfiguredInConfig
} from '../../../services/emailSettings.js';
import { getEmailTransports } from '../../../services/transports.js';

function value(setting: Setting[], name: string): string | null {
  const row = setting.find((s) => s.name === name);
  return row && row.value !== null && row.value !== undefined ? String(row.value) : null;
}

function intValue(setting: Setting[], name: string, fallback: number): number {
  const parsed = parseInt(value(setting, name) ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export default {
  Setting: {
    emailSendingEnabled: (s: Setting[]) => intValue(s, 'emailSendingEnabled', 0),
    emailTransport: (s: Setting[]) => value(s, 'emailTransport') || 'smtp',
    emailFromName: (s: Setting[]) => value(s, 'emailFromName'),
    emailFromAddress: (s: Setting[]) => value(s, 'emailFromAddress'),
    emailReplyTo: (s: Setting[]) => value(s, 'emailReplyTo'),
    emailAdminRecipients: (s: Setting[]) => value(s, 'emailAdminRecipients'),
    emailCustomerWelcomeEnabled: (s: Setting[]) => intValue(s, 'emailCustomerWelcomeEnabled', 1),
    emailLogBodyRetentionDays: (s: Setting[]) =>
      intValue(s, 'emailLogBodyRetentionDays', DEFAULT_BODY_RETENTION_DAYS),
    emailLogRetentionDays: (s: Setting[]) =>
      intValue(s, 'emailLogRetentionDays', DEFAULT_RETENTION_DAYS),
    smtpHost: (s: Setting[]) => value(s, 'smtpHost'),
    smtpPort: (s: Setting[]) => intValue(s, 'smtpPort', 587),
    smtpSecurity: (s: Setting[]) => value(s, 'smtpSecurity') || 'starttls',
    smtpUsername: (s: Setting[]) => value(s, 'smtpUsername'),
    // The password itself is never returned
    smtpPasswordSet: (s: Setting[]) => Boolean(value(s, 'smtpPassword')),
    smtpConfiguredInConfig: () => isSmtpConfiguredInConfig()
  },
  Query: {
    emailTransports: async () =>
      Promise.all(
        getEmailTransports().map(async (t) => ({
          code: t.code,
          name: t.name,
          supportsTracking: Boolean(t.supportsTracking),
          configured: await t.isConfigured().catch(() => false)
        }))
      )
  }
};
