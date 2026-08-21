import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Collection {
  uuid: string;
  [key: string]: unknown;
}

export default async function updateCollection(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const collection = (await getDelegate(
    'updateCollection',
    request
  )) as Collection;

  response.status(OK);
  response.json({
    data: {
      ...collection,
      links: [
        {
          rel: 'collectionGrid',
          href: buildUrl('collectionGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('collectionEdit', { id: collection.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
}