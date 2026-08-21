import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import deleteCategory from '../../services/category/deleteCategory.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function deleteCategoryApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  try {
    const { id } = request.params;

    const category = await deleteCategory(id as string, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.json({
      data: category
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