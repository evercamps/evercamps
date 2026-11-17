import nodemailer from 'nodemailer';
import type { EmailTransport } from '../types.js';
import { getSmtpSettings, SmtpSettings } from './emailSettings.js';

let cached: { key: string; transporter: nodemailer.Transporter } | null = null;

function getTransporter(settings: SmtpSettings): nodemailer.Transporter {
  const key = JSON.stringify(settings);
  if (cached && cached.key === key) {
    return cached.transporter;
  }
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.security === 'ssl',
    requireTLS: settings.security === 'starttls',
    ignoreTLS: settings.security === 'none',
    auth: settings.username
      ? { user: settings.username, pass: settings.password }
      : undefined
  });
  cached = { key, transporter };
  return transporter;
}

export const smtpTransport: EmailTransport = {
  code: 'smtp',
  name: 'SMTP',
  supportsTracking: false,
  isConfigured: async () => {
    const settings = await getSmtpSettings();
    return Boolean(settings.host);
  },
  send: async (message) => {
    const settings = await getSmtpSettings();
    const transporter = getTransporter(settings);
    const info = await transporter.sendMail({
      from: { name: message.from.name, address: message.from.email },
      to: message.to,
      replyTo: message.replyTo || undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        'X-Email-Log-Id': message.logUuid
      }
    });
    return { providerMessageId: info.messageId };
  }
};
