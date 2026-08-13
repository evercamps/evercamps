import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import type { NextFunction } from 'express';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const query = select();
    query.from('attribute');
    query.andWhere('attribute.uuid', '=', request.params.id);

    const attribute = await query.load(pool);

    if (attribute === null) {
      response.status(404);
      next();
      return;
    }

    setContextValue(request, 'attributeId', attribute.attribute_id);
    setContextValue(request, 'attributeUuid', attribute.uuid);
    setContextValue(request, 'pageInfo', {
      title: attribute.attribute_name,
      description: attribute.attribute_name
    });

    next();
  } catch (e) {
    next(e);
  }
};