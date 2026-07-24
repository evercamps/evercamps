import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): void => {
  try {
    request.logoutCustomer((error: Error | null) => {
      if (error) {
        response.status(INTERNAL_SERVER_ERROR);
        response.json({
          error: {
            status: INTERNAL_SERVER_ERROR,
            message: error.message
          }
        });
      } else {
        response.status(OK);
        response.$body = {
          data: {}
        };
        next();
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
};