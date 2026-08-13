import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';

export default (request: EvercampsRequest): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Plugins',
    description: 'Activate or deactivate registered plugins'
  });
};
