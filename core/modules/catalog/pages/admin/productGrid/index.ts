import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvercampsRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: EvercampsRequest) => {
  setContextValue(request, 'pageInfo', {
    title: 'Products',
    description: 'Products'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
