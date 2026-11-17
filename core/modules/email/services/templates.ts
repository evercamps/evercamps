import { addProcessor, getValueSync } from '../../../lib/util/registry.js';
import type { EmailLanguageContent, EmailTemplateDefinition } from '../types.js';
import { defineEmailTemplate, pickTemplateLanguage } from './templateContent.js';

export { defineEmailTemplate };

/**
 * Register a code template (call from a bootstrap file). A later registration
 * with the same code replaces the earlier one, so a plugin can override a core
 * template.
 */
export function registerEmailTemplate(template: EmailTemplateDefinition): void {
  addProcessor<EmailTemplateDefinition[]>('emailTemplates', (templates) => [
    ...(templates || []).filter((t) => t.code !== template.code),
    template
  ]);
}

export function getEmailTemplates(): EmailTemplateDefinition[] {
  return getValueSync<EmailTemplateDefinition[]>('emailTemplates', []) || [];
}

export function getEmailTemplateDefinition(code: string): EmailTemplateDefinition | undefined {
  return getEmailTemplates().find((t) => t.code === code);
}

/**
 * Subject and body of a template for a language: the shop language first,
 * then `en`.
 */
export function getEmailTemplate(
  code: string,
  language: string
): (EmailLanguageContent & { language: string }) | null {
  const definition = getEmailTemplateDefinition(code);
  return definition ? pickTemplateLanguage(definition, language) : null;
}
