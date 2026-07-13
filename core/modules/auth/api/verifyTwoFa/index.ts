import type { Request, Response, NextFunction } from 'express';
import { verify2FA } from '../../services/admin2FA.js';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  const { token } = request.body;
  const user = request.getCurrentUser();
  if (!user) {
    response.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  try {
    const result = await verify2FA(user.email, token);
    if (result.verified) {
      const data: { success: boolean; recoveryCodes?: string[] } = { success: true };
      if (result.recoveryCodes) {
        data.recoveryCodes = result.recoveryCodes;
      }
      response.json({ data });
    } else {
      response.status(INVALID_PAYLOAD).json({
        error: {
          message: translate('Invalid 2FA code'),
          status: INVALID_PAYLOAD
        }
      });
    }
  } catch (err) {
    response.status(500).json({ success: false, message: 'Something went wrong when verifying.' });
  }
};
