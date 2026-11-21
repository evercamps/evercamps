import crypto from 'crypto';
import { getCookieSecret } from '../../auth/services/getCookieSecret.js';
import { getSetting } from '../../setting/services/setting.js';

/** At most this many messages per IP within RATE_LIMIT_WINDOW_MINUTES */
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MINUTES = 60;

export const DEFAULT_RETENTION_DAYS = 365;

/** Name of the hidden honeypot field; people never fill it in, bots do */
export const HONEYPOT_FIELD = 'website';

/**
 * Where contact messages are emailed: the contact form recipient setting, or
 * the store email when that is empty.
 */
export async function getContactRecipient(): Promise<string> {
  const recipient = String(
    (await getSetting<string>('contactFormRecipient', '')) || ''
  ).trim();
  if (recipient) {
    return recipient;
  }
  return String((await getSetting<string>('storeEmail', '')) || '').trim();
}

export async function getRetentionDays(): Promise<number> {
  const value = parseInt(
    String(
      (await getSetting<string | number>(
        'contactMessageRetentionDays',
        DEFAULT_RETENTION_DAYS
      )) ?? ''
    ),
    10
  );
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_RETENTION_DAYS;
  }
  return Math.min(value, 3650);
}

/**
 * The visitor's IP, hashed with the site secret so the raw IP is never stored
 * and the hash can't be reversed by trying every address.
 */
export function hashIp(ip: string | undefined): string {
  return crypto
    .createHmac('sha256', String(getCookieSecret()))
    .update(ip || 'unknown')
    .digest('hex');
}
