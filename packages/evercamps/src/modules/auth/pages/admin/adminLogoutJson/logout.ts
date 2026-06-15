import type { Request, Response, NextFunction } from 'express';
import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../../lib/util/httpStatus.js';

export default (request: Request, response: Response, next: NextFunction) => {
  try {
    request.logoutUser((error?: any) => {
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
        (response as any).$body = { data: {} };
        next();
      }
    });
  } catch (error: any) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
