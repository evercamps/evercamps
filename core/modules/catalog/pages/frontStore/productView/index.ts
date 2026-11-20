import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { NextFunction } from 'express';
import { EvercampsResponse } from '../../../../../types/response.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
) => {
  try {
    const query = select();

    query
      .from('product')
      .leftJoin('product_description')
      .on(
        'product.product_id',
        '=',
        'product_description.product_description_product_id'
      );

    query
      .innerJoin('product_inventory')
      .on(
        'product.product_id',
        '=',
        'product_inventory.product_inventory_product_id'
      );

    query.where('product.uuid', '=', request.params.uuid);
    query.andWhere('status', '=', 1);

    const product = await query.load(pool);

    if (product === null) {
      response.status(404);
      next();
      return;
    }

    setContextValue(request, 'productId', product.product_id);
    setContextValue(request, 'pageInfo', {
      title: product.meta_title || product.name,
      description: product.meta_description || product.short_description
    });

    next();
  } catch (e) {
    next(e);
  }
};