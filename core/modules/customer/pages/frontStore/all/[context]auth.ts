import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: (error?: unknown) => void
): Promise<void> => {
  const { customerID } = request.session;

  if (!customerID) {
    delete request.locals?.customer;
    next();
    return;
  }

  // Load the customer from the database
  const customer = await select()
    .from('customer')
    .where('customer_id', '=', customerID)
    .and('status', '=', 1)
    .load(pool);

  if (!customer) {
    // The customer may not be logged in, or the account may be disabled
    // Logout the customer
    request.logoutCustomer((error: unknown) => {
      if (error) {
        next(error);
      } else {
        response.redirect(buildUrl('homepage'));
      }
    });
  } else {
    // Delete the password field
    delete customer.password;

    if (request.locals) {
      request.locals.customer = customer;
    }
    next();
  }
};