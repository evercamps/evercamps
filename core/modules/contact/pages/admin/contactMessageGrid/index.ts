import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Contact messages',
    description: 'Contact messages'
  });
  const query = request.query || {};
  setContextValue(request, 'contactMessageFilters', {
    page: parseInt(query.page, 10) || 1,
    limit: parseInt(query.limit, 10) || 30,
    search:
      typeof query.search === 'string' && query.search.trim() !== ''
        ? query.search.trim()
        : null
  });
};
