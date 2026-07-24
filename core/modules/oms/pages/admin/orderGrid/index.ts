import type { Request, Response } from 'express';
import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';

export default (request: EvercampsRequest): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Orders',
    description: 'Orders'
  });

  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request)
  );
};