import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import updateProduct from '../../services/product/updateProduct.js';

export default async function updateProductDelegate(
  request: EvercampsRequest,
  response: EvercampsResponse
) {
  const product = await updateProduct(
    request.params.id as string,
    request.body,
    {
      routeId: request.currentRoute.id
    }
  );

  return product;
}