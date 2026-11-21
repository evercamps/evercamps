/** A row of the contact_message table */
export type ContactMessageRow = {
  contact_message_id: number;
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  ip_hash: string;
  created_at: Date | string;
};

/** What the contact form posts to the submitContactMessage API */
export type ContactMessageInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Honeypot: people leave it empty, bots fill it in */
  website?: string;
};

/** Response of the submitContactMessage API */
export type SubmitContactMessageResponse = {
  data?: Record<string, never>;
  error?: { status: number; message: string };
};

/** A contact message, as the admin GraphQL type returns it */
export type ContactMessage = {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: string | null;
};

/** Filters of the admin contact message list */
export type ContactMessageFilters = {
  page: number;
  limit: number;
  search: string | null;
};

/** A page of contact messages, with the filters that produced it */
export type ContactMessageCollection = ContactMessageFilters & {
  items: ContactMessage[];
  total: number;
};

/** Settings of a contact form widget */
export type ContactFormWidget = {
  title: string;
  intro: string;
  className: string;
};

/** Contact form settings on the store settings page */
export type ContactFormSettings = {
  contactFormRecipient: string | null;
  contactMessageRetentionDays: number;
};
