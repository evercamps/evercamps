import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { deleteProductVariant } from '../../services/product/productVariants.js';

// DELETE /api/productVariants/:id  (id = variant uuid)
export default async function deleteProductVariantApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  try {
    const variant = await deleteProductVariant(request.params.id as string, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({ data: variant });
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
