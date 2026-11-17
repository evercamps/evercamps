import type { NextFunction } from 'express';
import { error } from '../../../../lib/log/logger.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { safeAbsoluteUrl } from '../../../email/services/orderEmailData.js';
import { sendEmail } from '../../../email/services/sendEmail.js';

/**
 * Sends the reset password email. Sent directly (not through an event), so the
 * plain token is never stored in the event table. Never fails the request.
 */
export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const token: string | undefined = response.locals?.resetPasswordToken;
    const customer = response.locals?.resetPasswordCustomer as
      | { customer_id: number; email: string; full_name?: string }
      | undefined;
    if (token && customer) {
      const lifetime = getConfig<number>('resetPasswordTokenLifetime', 48 * 60 * 60 * 1000);
      const base = safeAbsoluteUrl('updatePasswordPage');
      await sendEmail({
        template: 'reset_password',
        to: customer.email,
        data: {
          customer: { name: customer.full_name || '' },
          resetUrl: base ? `${base}?token=${encodeURIComponent(token)}` : '',
          expiresInHours: Math.round(lifetime / (60 * 60 * 1000))
        },
        entity: { type: 'customer', id: customer.customer_id }
      });
    }
  } catch (e) {
    error(e);
  }
  next();
};
