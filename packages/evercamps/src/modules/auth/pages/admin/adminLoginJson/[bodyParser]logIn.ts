import type { Request, Response, NextFunction } from 'express';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import {
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '../../../../../lib/util/httpStatus.js';
import { checkAdminUser2FA } from '../../../services/checkAdminUser2FA.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  try {
    const message = translate('Invalid email or password');
    const { body } = request;
    const { email, password, token } = body;

    const result = await checkAdminUser2FA(email, password, token);

    if (!result.exists) {
      return response.status(UNAUTHORIZED).json({
        error: { status: UNAUTHORIZED, message }
      });
    }

    if (result.twofaRequired && !token) {
      return response.status(OK).json({
        data: { twofaRequired: true, adminUserId: result.adminUserId }
      });
    }

    if (result.twofaRequired && token && !result.valid) {
      return response.status(UNAUTHORIZED).json({
        error: { status: UNAUTHORIZED, message: translate('Invalid 2FA code') }
      });
    }

    await request.loginUserWithEmail(email, password);

    const data: { sid: string; twofaSetupRequired?: boolean } = { sid: request.sessionID };
    if (result.twofaSetupRequired) {
      data.twofaSetupRequired = true;
    }
    response.status(OK).json({ data });
  } catch (error: any) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        message: error.message,
        status: INVALID_PAYLOAD
      }
    });
  }
};
