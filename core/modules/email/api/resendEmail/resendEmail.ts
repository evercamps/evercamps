import { error } from '../../../../lib/log/logger.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import type { ENext } from '../../../../types/middleware.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { resendLoggedEmail } from '../../services/sendEmail.js';

export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  try {
    const result = await resendLoggedEmail(String(request.params.id));
    if (!result) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'This email can not be resent: it does not exist or its content was removed'
        }
      });
      return;
    }
    response.status(OK);
    response.json({
      data: {
        status: result.status,
        error: result.error ?? null,
        logUrl: result.logUuid ? buildUrl('emailLogView', { id: result.logUuid }) : null
      }
    });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message }
    });
  }
};
