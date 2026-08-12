import { NextFunction } from 'express';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default async function (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
}