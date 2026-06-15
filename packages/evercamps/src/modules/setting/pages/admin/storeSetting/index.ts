import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Store Setting',
    description: 'Store Setting'
  });
};
