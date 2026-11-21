import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import type { ContactMessageFilters } from '../../../types/index.js';

export default (request: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Contact messages',
    description: 'Contact messages'
  });
  const query = request.query || {};
  const filters: ContactMessageFilters = {
    page: parseInt(query.page, 10) || 1,
    limit: parseInt(query.limit, 10) || 30,
    search:
      typeof query.search === 'string' && query.search.trim() !== ''
        ? query.search.trim()
        : null
  };
  setContextValue(request, 'contactMessageFilters', filters);
};
