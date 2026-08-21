import { OK, INTERNAL_SERVER_ERROR } from '../../../../lib/util/httpStatus.js';
import deleteCollection from '../../services/collection/deleteCollection.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function deleteCollectionApi(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  try {
    const { id } = request.params;

    const collection = await deleteCollection(id as string, {
      routeId: request.currentRoute.id
    });

    response.status(OK);
    response.json({
      data: collection
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