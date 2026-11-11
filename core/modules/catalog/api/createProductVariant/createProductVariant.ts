import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { createProductVariant } from '../../services/product/productVariants.js';

// POST /api/products/:id/variants  (id = product uuid)
export default async function createProductVariantApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  try {
    const variant = await createProductVariant(request.params.id as string, request.body, {
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
