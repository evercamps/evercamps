import { translate } from '../../../../../lib/locale/translate/translate.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '../../../../../lib/util/httpStatus.js';
import { checkAdminUser2FA } from '../../../services/checkAdminUser2FA.js';

export default async (request, response, next) => {
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
    
    response.status(OK).json({ data: { sid: request.sessionID } });
  } catch (error) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        message: error.message,
        status: INVALID_PAYLOAD
      }
    });
  }
};
