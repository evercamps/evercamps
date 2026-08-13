import createProduct from '../../services/product/createProduct.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function createProductApi(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<unknown> {
  const result = await createProduct(request.body, {
    routeId: request.currentRoute.id
  });

  return result;
}