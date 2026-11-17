import { error } from '../../../../lib/log/logger.js';
import { sendOrderConfirmation } from '../../services/orderEmails.js';

export default async function sendOrderConfirmationSubscriber(data: { order_id?: number }) {
  try {
    if (!data?.order_id) {
      return;
    }
    await sendOrderConfirmation(Number(data.order_id));
  } catch (e) {
    error(e);
  }
}
