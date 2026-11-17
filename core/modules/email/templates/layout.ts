import { escapeHtml } from '../services/escapeHtml.js';

type LayoutData = {
  storeName: string;
  storeEmail: string;
  language: string;
  subject: string;
  body: string;
};

/**
 * Shared HTML layout for all emails: store name header, body, footer with the
 * store email. Inline CSS only, because many mail clients ignore <style>.
 */
export function renderLayout({ storeName, storeEmail, language, subject, body }: LayoutData): string {
  const name = escapeHtml(storeName);
  const email = escapeHtml(storeEmail);
  const footer = storeEmail
    ? `${name} &middot; <a href="mailto:${email}" style="color:#6b7280;">${email}</a>`
    : name;
  return `<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;font-size:20px;font-weight:bold;">${name}</td></tr>
<tr><td style="padding:24px 32px;">${body}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
