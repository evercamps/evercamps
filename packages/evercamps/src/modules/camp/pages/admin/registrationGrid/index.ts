import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any, response: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Registrations',
    description: 'Registrations'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
