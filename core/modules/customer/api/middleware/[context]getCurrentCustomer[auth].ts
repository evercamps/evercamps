import util from 'util';
import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import type { NextFunction, Request, Response } from 'express';

import { pool } from '../../../../lib/postgres/connection.js';
import { getFrontStoreSessionCookieName } from '../../../auth/services/getFrontStoreSessionCookieName.js';

interface Customer {
  customer_id: number;
  email?: string;
  password?: string;
  status?: number;
  [key: string]: unknown;
}

interface CustomerSessionData {
  customerID: number;
  [key: string]: unknown;
}

interface CustomerRequest extends Request {
  locals: {
    customer?: Customer;
    sessionID?: string;
    [key: string]: unknown;
  };
  getCurrentCustomer(): Customer | null;
}

/**
 * This is the session based authentication middleware.
 * We do not implement session middleware on API routes,
 * instead we only load the session from the database and set the customer in the context.
 */
export default async (
  request: CustomerRequest,
  response: Response,
  next: NextFunction
): Promise<void> => {
  let currentCustomer = request.getCurrentCustomer();

  if (!currentCustomer) {
    try {
      const cookies = request.signedCookies;

      const storeFrontSessionCookieName =
        getFrontStoreSessionCookieName();

      const sessionID = cookies[storeFrontSessionCookieName];

      if (sessionID) {
        const storage = new (sessionStorage(session))({
          pool
        });

        const getSession = util.promisify(
          storage.get
        ).bind(storage) as (
          sid: string
        ) => Promise<CustomerSessionData | null>;

        const customerSessionData = await getSession(sessionID);

        if (customerSessionData) {
          currentCustomer = (await select()
            .from('customer')
            .where(
              'customer_id',
              '=',
              customerSessionData.customerID
            )
            .and('status', '=', 1)
            .load(pool)) as Customer | null;

          if (currentCustomer) {
            delete currentCustomer.password;

            request.locals.customer = currentCustomer;
          }
        }

        request.locals.sessionID = sessionID;
      }
    } catch (e) {
      // Customer is not authenticated, ignore errors
    }
  }

  next();
};