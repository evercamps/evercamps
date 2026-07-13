import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: any, response: any) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new participant',
    description: 'Create a new participant'
  });
};
