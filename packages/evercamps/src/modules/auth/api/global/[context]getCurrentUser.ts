import util from 'util';
import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../graphql/services/contextHelper.js';
import { getAdminSessionCookieName } from '../../services/getAdminSessionCookieName.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  let currentAdminUser = request.getCurrentUser();
  if (!currentAdminUser) {
    try {
      const cookies = (request as any).signedCookies;
      const adminSessionCookieName = getAdminSessionCookieName();
      const sessionID = cookies[adminSessionCookieName];
      if (sessionID) {
        const storage = new (sessionStorage(session))({ pool });
        const getSession = util.promisify(storage.get).bind(storage);
        const adminSessionData = await getSession(sessionID);
        if (adminSessionData) {
          currentAdminUser = await select()
            .from('admin_user')
            .where('admin_user_id', '=', (adminSessionData as any).userID)
            .and('status', '=', 1)
            .load(pool);

          if (currentAdminUser) {
            delete (currentAdminUser as any).password;
            (request as any).locals.user = currentAdminUser;
            setContextValue(request, 'user', currentAdminUser);
          }
        }
      }
    } catch (e) {
      // user not logged in
    }
  }
  next();
};
