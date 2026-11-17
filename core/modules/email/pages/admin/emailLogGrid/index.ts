import { setContextValue } from '../../../../graphql/services/contextHelper.js';

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export default (request: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Email log',
    description: 'Email log'
  });
  const query = request.query || {};
  setContextValue(request, 'emailLogFilters', {
    page: parseInt(query.page, 10) || 1,
    limit: parseInt(query.limit, 10) || 30,
    status: str(query.status),
    template: str(query.template),
    recipient: str(query.recipient)
  });
};
