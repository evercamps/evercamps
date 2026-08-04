import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import type { NextFunction, Request, Response } from 'express';
import { EvercampsRequest } from '../../../../../types/request.js';

interface Category {
  category_id: number;
  meta_title?: string;
  meta_description?: string;
  name: string;
  short_description?: string;
}

export default async function (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = select();

    query
      .from('category')
      .leftJoin('category_description')
      .on(
        'category.category_id',
        '=',
        'category_description.category_description_category_id'
      );

    query.where('category.uuid', '=', request.params.uuid);

    const category = (await query.load(pool)) as Category | null;

    if (category === null) {
      response.status(404);
      next();
      return;
    }

    setContextValue(request, 'categoryId', category.category_id);

    setContextValue(request, 'pageInfo', {
      title: category.meta_title || category.name,
      description:
        category.meta_description || category.short_description,
      url: request.url
    });

    next();
  } catch (e) {
    next(e);
  }
}