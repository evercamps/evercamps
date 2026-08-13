import { EvercampsRequest } from '../../../../../types/request.js';
import { EvercampsResponse } from '../../../../../types/response.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (
  request: EvercampsRequest,
  response: EvercampsResponse
) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new category',
    description: 'Create a new category'
  });
};