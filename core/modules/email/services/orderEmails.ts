import type { SendEmailResult } from '../types.js';
import { getEmailSettings } from './emailSettings.js';
import { loadOrderEmailData } from './orderEmailData.js';
import { logSkippedEmail, sendEmail } from './sendEmail.js';

/**
 * Order confirmation to the customer. Sent once per order (idempotency key);
 * `resend` skips that check, for the "Resend" button on the order page.
 */
export async function sendOrderConfirmation(orderId: number, resend = false): Promise<SendEmailResult> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) {
    return { status: 'failed', error: `Order ${orderId} not found` };
  }
  const entity = { type: 'order', id: orderId };
  if (!loaded.order.customer_email) {
    await logSkippedEmail('order_confirmation', '', 'Order has no customer email', entity);
    return { status: 'skipped' };
  }
  return sendEmail({
    template: 'order_confirmation',
    to: loaded.order.customer_email,
    data: loaded.data,
    entity,
    idempotencyKey: resend ? undefined : `order_confirmation:order:${orderId}`
  });
}

/** New-order notification to the admin recipients (only when that setting is filled) */
export async function sendAdminNewOrder(orderId: number): Promise<void> {
  const settings = await getEmailSettings();
  if (settings.adminRecipients.length === 0) {
    return;
  }
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) {
    return;
  }
  for (const recipient of settings.adminRecipients) {
    await sendEmail({
      template: 'admin_new_order',
      to: recipient,
      data: loaded.data,
      entity: { type: 'order', id: orderId },
      idempotencyKey: `admin_new_order:order:${orderId}:${recipient.toLowerCase()}`
    });
  }
}

export async function sendOrderCanceled(orderId: number): Promise<SendEmailResult> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) {
    return { status: 'failed', error: `Order ${orderId} not found` };
  }
  const entity = { type: 'order', id: orderId };
  if (!loaded.order.customer_email) {
    await logSkippedEmail('order_canceled', '', 'Order has no customer email', entity);
    return { status: 'skipped' };
  }
  return sendEmail({
    template: 'order_canceled',
    to: loaded.order.customer_email,
    data: loaded.data,
    entity,
    idempotencyKey: `order_canceled:order:${orderId}`
  });
}
