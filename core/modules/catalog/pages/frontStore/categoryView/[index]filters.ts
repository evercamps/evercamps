import { NextFunction } from 'express';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async function (
  request: EvercampsRequest,
  next: NextFunction
): Promise<void> {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
}