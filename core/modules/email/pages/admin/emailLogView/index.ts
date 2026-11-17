import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Email',
    description: 'Email'
  });
  setContextValue(request, 'emailLogUuid', String(request.params.id || ''));
};
