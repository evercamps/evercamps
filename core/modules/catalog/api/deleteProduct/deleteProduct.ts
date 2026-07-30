import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';
import deleteProduct from '../../services/product/deleteProduct.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function deleteProductApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  try {
    const { id } = request.params;

    const product = await deleteProduct(id as string, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.json({
      data: product
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
}