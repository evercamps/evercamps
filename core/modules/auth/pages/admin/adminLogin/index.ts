import type { Response, NextFunction } from 'express';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { EvercampsRequest } from '../../../../../types/request.js';

export default (request: EvercampsRequest, response: Response, next: NextFunction) => {
  const user = request.getCurrentUser();
  if (user) {
    response.redirect(buildUrl('dashboard'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Admin Login',
      description: 'Admin Login'
    });
    next();
  }
};
