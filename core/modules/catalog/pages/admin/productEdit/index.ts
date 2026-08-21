import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

interface Product {
  product_id: number;
  uuid: string;
  meta_title?: string | null;
  name: string;
  meta_description?: string | null;
  short_description?: string | null;
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: (error?: unknown) => void
) => {
  try {
    const query = select();

    query.from('product');

    query.andWhere('product.uuid', '=', request.params.id);

    query
      .leftJoin('product_description')
      .on(
        'product_description.product_description_product_id',
        '=',
        'product.product_id'
      );

    const product = (await query.load(pool)) as Product | null;

    if (product === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'productId', product.product_id);
      setContextValue(request, 'productUuid', product.uuid);

      setContextValue(request, 'pageInfo', {
        title: product.meta_title || product.name,
        description:
          product.meta_description || product.short_description
      });

      next();
    }
  } catch (e) {
    next(e);
  }
};