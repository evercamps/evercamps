import { error } from '../../../../lib/log/logger.js';
import { setDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import createCustomerAddress from '../../services/customer/address/createCustomerAddress.js';
import type { Request, Response, NextFunction } from 'express';

interface CustomerAddress {
  uuid: string;
  [key: string]: unknown;
}

interface ErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

export default async function createCustomerAddressController(
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> {
  try {
    const address = (await createCustomerAddress(
      request.params.customer_id as string,
      request.body,
      {
        routeId: request.currentRoute.id
      }
    )) as CustomerAddress;

    setDelegate('createCustomerAddress', address, request);

    response.status(OK);

    response.$body = {
      data: {
        ...address,
        links: [
          {
            rel: 'edit',
            href: buildUrl('updateCustomerAddress', {
              address_id: address.uuid,
              customer_id: request.params.customer_id
            }),
            action: 'UPDATE',
            types: ['application/json']
          },
          {
            rel: 'delete',
            href: buildUrl('deleteCustomerAddress', {
              address_id: address.uuid,
              customer_id: request.params.customer_id
            }),
            action: 'DELETE',
            types: ['application/json']
          }
        ]
      }
    };

    next();
  } catch (e) {
    error(e);

    response.status(INTERNAL_SERVER_ERROR);

    const body: ErrorResponse = {
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Unknown error'
      }
    };

    response.json(body);
  }
}