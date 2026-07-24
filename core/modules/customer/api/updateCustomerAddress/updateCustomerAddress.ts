import { select } from '@evershop/postgres-query-builder';
import { NextFunction } from 'express';

import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import updateCustomerAddress from '../../services/customer/address/updateCustomerAddress.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Customer {
  customer_id: number;
  uuid: string;
}

interface CustomerAddress {
  uuid: string;
}

interface UpdatedAddress {
  uuid: string;
  [key: string]: unknown;
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = (await select()
      .from('customer')
      .where('uuid', '=', request.params.customer_id)
      .load(pool)) as Customer | null;

    if (!customer) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid customer'
        }
      });
      return;
    }

    const address = (await select()
      .from('customer_address')
      .where('uuid', '=', request.params.address_id)
      .and('customer_id', '=', customer.customer_id)
      .load(pool)) as CustomerAddress | null;

    if (!address) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid address'
        }
      });
      return;
    }

    const newAddress = (await updateCustomerAddress(
      request.params.address_id as string,
      request.body,
      {
        routeId: request.currentRoute.id
      }
    )) as UpdatedAddress;

    response.status(OK);

    response.$body = {
      data: {
        ...newAddress,
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
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
};