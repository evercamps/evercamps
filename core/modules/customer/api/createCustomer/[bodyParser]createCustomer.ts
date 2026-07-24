import { error } from '../../../../lib/log/logger.js';
import { setDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import createCustomer from '../../services/customer/createCustomer.js';

interface NextFunction {
  (): void;
}

interface Customer {
  uuid: string;
  [key: string]: unknown;
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = (await createCustomer(request.body, {
      routeId: request.currentRoute.id
    })) as Customer;

    setDelegate('createCustomer', customer, request);

    response.status(OK);

    response.$body = {
      data: {
        ...customer,
        links: [
          {
            rel: 'customerGrid',
            href: buildUrl('customerGrid'),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'edit',
            href: buildUrl('customerEdit', {
              id: customer.uuid
            }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    };

    next();
  } catch (e) {
    error(e);

    response.status(INTERNAL_SERVER_ERROR);

    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message:
          e instanceof Error ? e.message : String(e)
      }
    });
  }
};