export type EmailLanguageContent = {
  subject: string;
  body: string;
};

export type EmailTemplateDefinition = {
  code: string;
  /** Short description shown in the email log */
  name: string;
  /** Placeholders the template uses; documentation and test sample data */
  variables: string[];
  /** Sample data used by the render test */
  sampleData?: Record<string, any>;
  en: EmailLanguageContent;
  [language: string]: EmailLanguageContent | string | string[] | Record<string, any> | undefined;
};

export type EmailMessage = {
  logUuid: string;
  templateCode: string;
  from: { name: string; email: string };
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailTransport = {
  code: string;
  name: string;
  supportsTracking?: boolean;
  isConfigured(): Promise<boolean>;
  send(message: EmailMessage): Promise<{ providerMessageId?: string }>;
};

export type EmailEntity = {
  type: string;
  id: number;
};

export type SendEmailInput = {
  template: string;
  to: string;
  data: Record<string, any>;
  language?: string;
  entity?: EmailEntity;
  idempotencyKey?: string;
  /** Reply-to for this email only; defaults to the global reply-to setting */
  replyTo?: string;
};

export type EmailLogStatus =
  | 'queued'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'delivered'
  | 'bounced'
  | 'spam'
  | 'blocked';

export type SendEmailResult = {
  status: EmailLogStatus | 'duplicate' | 'disabled';
  logUuid?: string;
  error?: string;
};

export type EmailEventName =
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'spam'
  | 'blocked'
  | 'invalid'
  | 'deferred'
  | 'unsubscribed'
  | 'error';
