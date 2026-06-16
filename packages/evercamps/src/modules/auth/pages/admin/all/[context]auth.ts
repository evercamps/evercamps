import { select } from '@evershop/postgres-query-builder';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  const { userID } = (request as any).session;
  const user = await select()
    .from('admin_user')
    .where('admin_user_id', '=', userID)
    .and('status', '=', 1)
    .load(pool);

  if (!user) {
    request.logoutUser(() => {
      const currentRoute = (request as any).currentRoute;
      if (
        currentRoute.id === 'adminLogin' ||
        currentRoute.id === 'adminLoginJson'
      ) {
        next();
      } else {
        response.redirect(buildUrl('adminLogin'));
      }
    });
  } else {
    delete user.password;
    (request as any).locals.user = user;
    next();
  }
};
