import createCollection from '../../services/collection/createCollection.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

export default async function createCollectionApi(
  request: EvercampsRequest,
  response: EvercampsResponse
): Promise<unknown> {
  const collection = await createCollection(request.body, {
    routeId: request.currentRoute.id
  });

  return collection;
}