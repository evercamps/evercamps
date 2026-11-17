// Public API of the email module, for other modules and plugins
// (plugins import it from dist/modules/email/services/index.js).
export { sendEmail, logSkippedEmail, resendLoggedEmail, deliverLogRow } from './sendEmail.js';
export { recordEmailEvent } from './recordEmailEvent.js';
export { registerEmailTransport, getEmailTransports, getTransport } from './transports.js';
export {
  defineEmailTemplate,
  registerEmailTemplate,
  getEmailTemplate,
  getEmailTemplates
} from './templates.js';
export { getEmailSettings, getShopLanguage } from './emailSettings.js';
export { renderEmail, escapeHtml, htmlToText } from './renderTemplate.js';
export { sendOrderConfirmation, sendAdminNewOrder, sendOrderCanceled } from './orderEmails.js';
export type {
  EmailMessage,
  EmailTransport,
  EmailTemplateDefinition,
  SendEmailInput,
  SendEmailResult,
  EmailEventName
} from '../types.js';
