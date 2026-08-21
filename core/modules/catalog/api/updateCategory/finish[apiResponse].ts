import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Category {
  uuid: string;
  [key: string]: unknown;
}

export default async function updateCategory(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const category = (await getDelegate(
    'updateCategory',
    request
  )) as Category;

  response.status(OK);
  response.json({
    data: {
      ...category,
      links: [
        {
          rel: 'categoryGrid',
          href: buildUrl('categoryGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'view',
          href: buildUrl('categoryView', { uuid: category.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('categoryEdit', { id: category.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
}