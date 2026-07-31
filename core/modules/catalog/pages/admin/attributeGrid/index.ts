import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';

export default (request: EvercampsRequest, response: EvercampsResponse) => {
  setContextValue(request, 'pageInfo', {
    title: 'Attributes',
    description: 'Attributes'
  });

  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};