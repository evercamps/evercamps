import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';
import updateCollection from '../../services/collection/updateCollection.js';

export default async function updateCollectionDelegate(
  request: EvercampsRequest,
  response: EvercampsResponse
) {
  const collection = await updateCollection(
    request.params.id as string,
    request.body,
    {
      routeId: request.currentRoute.id
    }
  );

  return collection;
}