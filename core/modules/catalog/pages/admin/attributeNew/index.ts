import { EvercampsRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: EvercampsRequest) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new attribute',
    description: 'Create a new attribute'
  });
};