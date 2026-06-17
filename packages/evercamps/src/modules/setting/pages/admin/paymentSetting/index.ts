import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Payment Setting',
    description: 'Payment Setting'
  });
};
