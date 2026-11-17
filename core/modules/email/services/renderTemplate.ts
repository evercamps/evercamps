import { renderLayout } from '../templates/layout.js';
import { escapeHtml } from './escapeHtml.js';

export { escapeHtml };

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  /** Placeholders that had no value in the data */
  missing: string[];
};

function getPath(data: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<any>(
    (current, key) => (current === null || current === undefined ? undefined : current[key]),
    data
  );
}

/**
 * Replace placeholders:
 * - `{{{ name }}}` inserts the value as is (HTML built by code, e.g. a table)
 * - `{{ name }}` inserts the HTML-escaped value (or plain value when `escape` is false)
 * Unknown placeholders become empty and are reported in `missing`.
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, any>,
  escape = true,
  missing: string[] = []
): string {
  const withRaw = template.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, path: string) => {
    const value = getPath(data, path);
    if (value === undefined || value === null) {
      missing.push(path);
      return '';
    }
    return String(value);
  });
  return withRaw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const value = getPath(data, path);
    if (value === undefined || value === null) {
      missing.push(path);
      return '';
    }
    return escape ? escapeHtml(value) : String(value);
  });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** A simple plain-text version of the HTML body */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(style|head|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
        const text = label.replace(/<[^>]+>/g, '').trim();
        return text && text !== href ? `${text} (${href})` : href;
      })
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|tr|li|table)>/gi, '\n')
      .replace(/<\/t[dh]>/gi, '  ')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Render a template body and subject with data, wrap the body in the layout
 * and build the text part.
 */
export function renderEmail(
  content: { subject: string; body: string },
  data: Record<string, any>,
  layoutData: { storeName: string; storeEmail: string; language: string }
): RenderedEmail {
  const missing: string[] = [];
  const subject = replacePlaceholders(content.subject, data, false, missing).replace(/\s+/g, ' ').trim();
  const body = replacePlaceholders(content.body, data, true, missing);
  const html = renderLayout({ ...layoutData, subject, body });
  return {
    subject,
    html,
    text: htmlToText(body),
    missing: Array.from(new Set(missing))
  };
}
