import { select } from '@evershop/postgres-query-builder';
import type { NextFunction } from 'express';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const group = await select()
      .from('attribute_group')
      .where('uuid', '=', request.params.id)
      .load(pool);

    if (group === null) {
      response.status(404);
      next();
      return;
    }

    setContextValue(request, 'attributeGroupId', group.attribute_group_id);
    setContextValue(request, 'pageInfo', {
      title: group.group_name,
      description: group.group_name
    });

    next();
  } catch (e) {
    next(e);
  }
};
