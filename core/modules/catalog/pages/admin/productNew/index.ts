import { EvercampsRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: EvercampsRequest): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new product',
    description: 'Create a new product'
  });
};