import type { NextFunction } from 'express';
import { error, warning } from '../../../../lib/log/logger.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { logSkippedEmail, sendEmail } from '../../../email/services/sendEmail.js';
import { getContactRecipient } from '../../services/contactSettings.js';
import type { ContactMessageRow } from '../../types/index.js';

/**
 * Emails a stored contact message to the organiser, with the visitor as
 * reply-to. The message is already saved, so a failed email never fails the
 * request; it shows up in the email log instead.
 */
export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const saved = response.locals?.contactMessage as ContactMessageRow | undefined;
    if (saved) {
      const entity = { type: 'contact_message', id: saved.contact_message_id };
      const recipient = await getContactRecipient();
      if (!recipient) {
        warning('Contact form: no recipient, set the contact form recipient or the store email');
        await logSkippedEmail('contact_message', '', 'No contact form recipient or store email', entity);
      } else {
        await sendEmail({
          template: 'contact_message',
          to: recipient,
          replyTo: saved.email,
          data: {
            contact: {
              name: saved.name,
              email: saved.email,
              phone: saved.phone || '-',
              message: saved.message
            }
          },
          entity,
          idempotencyKey: `contact_message:${saved.contact_message_id}`
        });
      }
    }
  } catch (e) {
    error(e);
  }
  next();
};
