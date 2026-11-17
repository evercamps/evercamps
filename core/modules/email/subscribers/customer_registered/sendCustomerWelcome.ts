import { error } from '../../../../lib/log/logger.js';
import { getEmailSettings } from '../../services/emailSettings.js';
import { safeAbsoluteUrl } from '../../services/orderEmailData.js';
import { sendEmail } from '../../services/sendEmail.js';

export default async function sendCustomerWelcome(data: {
  customer_id?: number;
  email?: string;
  full_name?: string;
}) {
  try {
    if (!data?.customer_id || !data.email) {
      return;
    }
    const settings = await getEmailSettings();
    if (!settings.customerWelcomeEnabled) {
      return;
    }
    await sendEmail({
      template: 'customer_welcome',
      to: data.email,
      data: {
        customer: { name: data.full_name || '' },
        loginUrl: safeAbsoluteUrl('login')
      },
      entity: { type: 'customer', id: Number(data.customer_id) },
      idempotencyKey: `customer_welcome:customer:${data.customer_id}`
    });
  } catch (e) {
    error(e);
  }
}
