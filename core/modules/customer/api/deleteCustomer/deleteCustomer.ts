import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import deleteCustomer from '../../services/customer/deleteCustomer.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: unknown
): Promise<void> => {
  try {
    const customer = await deleteCustomer(request.params.id as string, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.json({
      data: customer
    });
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