import type { Request, Response, NextFunction } from 'express';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: Request, response: Response, next: NextFunction) => {
  const user = request.getCurrentUser();
  if (user) {
    setContextValue(request, 'adminUserId', user.admin_user_id);
  }

  setContextValue(request, 'pageInfo', {
    title: 'Admin 2FA Setup',
    description: 'Admin 2FA Setup'
  });
  next();
};
