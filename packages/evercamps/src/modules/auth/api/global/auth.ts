import type { Request, Response, NextFunction } from 'express';
import { UNAUTHORIZED } from '../../../../lib/util/httpStatus.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  const currentRoute = (request as any).currentRoute;
  const currentAdminUser = request.getCurrentUser();

  if (currentRoute?.access === 'public') {
    next();
    return;
  }

  if (!currentAdminUser?.uuid) {
    response.status(UNAUTHORIZED);
    response.json({
      error: {
        status: UNAUTHORIZED,
        message: 'Unauthorized'
      }
    });
  } else {
    let userRoles: string | string[] = currentAdminUser.roles || '*';
    if (userRoles === '*') {
      next();
    } else {
      userRoles = (userRoles as string).split(',');
      if ((userRoles as string[]).includes(currentRoute.id)) {
        next();
      } else {
        response.status(UNAUTHORIZED);
        response.json({
          error: {
            status: UNAUTHORIZED,
            message: 'Unauthorized'
          }
        });
      }
    }
  }
};
