// No imports from lib/ here, so the unit tests can load this file from source.
import type { EmailLanguageContent, EmailTemplateDefinition } from '../types.js';

/** Identity helper that gives template files type checking */
export function defineEmailTemplate(template: EmailTemplateDefinition): EmailTemplateDefinition {
  return template;
}

/**
 * Subject and body of a template for a language: the exact language, then
 * its short form (nl-BE → nl), then `en`.
 */
export function pickTemplateLanguage(
  definition: EmailTemplateDefinition,
  language: string
): (EmailLanguageContent & { language: string }) | null {
  const short = (language || 'en').toLowerCase().split(/[-_]/)[0];
  for (const lang of [language, short, 'en']) {
    const content = definition[lang] as EmailLanguageContent | undefined;
    if (content && typeof content === 'object' && 'subject' in content && 'body' in content) {
      return { ...content, language: lang };
    }
  }
  return null;
}
