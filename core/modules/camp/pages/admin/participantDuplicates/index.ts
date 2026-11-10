import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any, response: any) => {
  const threshold = parseFloat(request.query.threshold);
  setContextValue(request, 'pageInfo', {
    title: 'Possible duplicates',
    description: 'Possible duplicate participants'
  });
  setContextValue(
    request,
    'duplicateThreshold',
    Number.isFinite(threshold) ? threshold : null
  );
};
