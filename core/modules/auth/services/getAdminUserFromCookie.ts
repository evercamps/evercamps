import util from 'util';
import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '../../../lib/postgres/connection.js';
import { getAdminSessionCookieName } from './getAdminSessionCookieName.js';

let storage: any;

function getStorage() {
  if (!storage) {
    storage = new (sessionStorage(session))({ pool });
  }
  return storage;
}

/**
 * Finds the active admin user behind the admin session cookie.
 *
 * Use it on requests that don't get the admin session themselves (API
 * routes, storefront pages). The browser sends the admin cookie on every
 * path, signed with the same secret as the storefront cookie.
 *
 * @returns the admin user without its password, or null when there is no
 * valid admin session or the user is disabled.
 */
export async function getAdminUserFromCookie(
  request: any
): Promise<Record<string, any> | null> {
  try {
    const sessionID = request.signedCookies?.[getAdminSessionCookieName()];
    if (!sessionID) {
      return null;
    }
    const store = getStorage();
    const getSession = util.promisify(store.get).bind(store);
    const adminSessionData: any = await getSession(sessionID);
    if (!adminSessionData?.userID) {
      return null;
    }
    const user = await select()
      .from('admin_user')
      .where('admin_user_id', '=', adminSessionData.userID)
      .and('status', '=', 1)
      .load(pool);
    if (!user) {
      return null;
    }
    delete (user as any).password;
    return user;
  } catch (e) {
    return null;
  }
}
