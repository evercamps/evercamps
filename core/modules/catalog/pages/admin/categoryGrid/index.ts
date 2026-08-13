import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse
) => {
  setContextValue(request, 'pageInfo', {
    title: 'Categories',
    description: 'Categories'
  });

  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request)
  );
};