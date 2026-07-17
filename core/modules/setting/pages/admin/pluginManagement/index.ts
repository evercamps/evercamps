import type { Request } from 'express';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: Request): void => {
  setContextValue(request, 'pageInfo', {
    title: 'Plugins',
    description: 'Activate or deactivate registered plugins'
  });
};
