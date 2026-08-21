import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface Product {
  uuid: string;
  [key: string]: unknown;
}

export default async function updateProduct(
  request: EvercampsRequest,
  response: EvercampsResponse,
  _next: () => void
): Promise<void> {
  const product = (await getDelegate(
    'updateProduct',
    request
  )) as Product;

  response.status(OK);
  response.json({
    data: {
      ...product,
      links: [
        {
          rel: 'productGrid',
          href: buildUrl('productGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'view',
          href: buildUrl('productView', { uuid: product.uuid }),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('productEdit', { id: product.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
}