import { NextFunction } from 'express';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../../modules/graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';
export default (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): void => {
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
  next();
};