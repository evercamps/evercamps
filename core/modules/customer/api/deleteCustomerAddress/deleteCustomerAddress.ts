import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import deleteCustomerAddress from '../../services/customer/address/deleteCustomerAddress.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';

interface Customer {
  customer_id: number;
}

interface CustomerAddress {
  uuid: string;
  customer_id: number;
}

interface Route {
  id: string;
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
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

    const deletedAddress = await deleteCustomerAddress(
      request.params.address_id as string,
      {
        routeId: request.currentRoute.id
      }
    );

    response.status(OK);
    response.json({
      data: deletedAddress
    });
  } catch (e: unknown) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
};