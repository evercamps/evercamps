import { error } from '../../../../lib/log/logger.js';
import { sendAdminNewOrder } from '../../services/orderEmails.js';

export default async function sendAdminNewOrderSubscriber(data: { order_id?: number }) {
  try {
    if (!data?.order_id) {
      return;
    }
    await sendAdminNewOrder(Number(data.order_id));
  } catch (e) {
    error(e);
  }
}
