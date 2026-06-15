import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../../../../lib/util/getEnv.js';
import { UNAUTHORIZED } from '../../../../lib/util/httpStatus.js';

export default (request: Request, response: Response, next: NextFunction) => {
  const currentRoute = (request as any).currentRoute;
  if (
    request.method === 'GET' ||
    currentRoute?.id === 'adminGraphql' ||
    currentRoute?.access === 'public'
  ) {
    next();
  } else {
    const user = request.getCurrentUser();
    const currentUserEmail = user?.email;
    const demoUserEmails = getEnv('DEMO_USER_EMAILS', '').split(',');

    if (demoUserEmails && demoUserEmails.includes(currentUserEmail)) {
      response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'The demo account is not allowed to make changes'
        }
      });
    } else {
      next();
    }
  }
};
