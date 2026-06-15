import type { Request, Response, NextFunction } from 'express';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: Request, response: Response, next: NextFunction) => {
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
