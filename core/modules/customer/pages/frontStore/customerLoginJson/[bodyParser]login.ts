import { translate } from '../../../../../lib/locale/translate/translate.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

interface LoginRequestBody {
  email: string;
  password: string;
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): Promise<void> => {
  const { email, password } = request.body as LoginRequestBody;
  const message = translate('Invalid email or password');

  try {
    await request.loginCustomerWithEmail(
      email,
      password,
      (error: Error | null) => {
        if (error) {
          response.status(INTERNAL_SERVER_ERROR);
          response.json({
            error: {
              status: INTERNAL_SERVER_ERROR,
              message
            }
          });
          return;
        }

        response.status(OK);
        response.$body = {
          data: {
            sid: request.sessionID
          }
        };

        next();
      }
    );
  } catch (error) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
};