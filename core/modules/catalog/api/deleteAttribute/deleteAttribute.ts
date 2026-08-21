import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteProductAttribute from '../../services/attribute/deleteProductAttribute.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function deleteProductAttributeApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  try {
    const { id } = request.params;

    const attribute = await deleteProductAttribute(id as string, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.json({
      data: attribute
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