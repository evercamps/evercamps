import { error } from '../../../../lib/log/logger.js';
import { loadRegistrationEmailData } from '../../services/registrationEmailData.js';
import { logSkippedEmail, sendEmail } from '../../services/sendEmail.js';

/**
 * Confirmation to the parent when an admin adds a registration. Checkout
 * registrations don't emit registration_created (the parent gets the order
 * confirmation), and imports don't set send_email.
 */
export default async function sendRegistrationConfirmation(data: {
  registration_id?: number;
  send_email?: boolean;
}) {
  try {
    if (!data?.registration_id || data.send_email !== true) {
      return;
    }
    const registrationId = Number(data.registration_id);
    const entity = { type: 'registration', id: registrationId };
    const loaded = await loadRegistrationEmailData(registrationId);
    if (!loaded) {
      return;
    }
    if (!loaded.customerEmail) {
      await logSkippedEmail('registration_confirmation', '', 'No parent email', entity);
      return;
    }
    await sendEmail({
      template: 'registration_confirmation',
      to: loaded.customerEmail,
      data: loaded.data,
      entity,
      idempotencyKey: `registration_confirmation:registration:${registrationId}`
    });
  } catch (e) {
    error(e);
  }
}
