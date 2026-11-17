import { error } from '../../../../lib/log/logger.js';
import { sendOrderCanceled } from '../../services/orderEmails.js';

export default async function sendOrderCanceledSubscriber(data: {
  order_id?: number;
  before?: string;
  after?: string;
}) {
  try {
    if (!data?.order_id || data.after !== 'canceled' || data.before === 'canceled') {
      return;
    }
    await sendOrderCanceled(Number(data.order_id));
  } catch (e) {
    error(e);
  }
}
