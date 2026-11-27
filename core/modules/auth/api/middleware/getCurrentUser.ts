import type { Response, NextFunction } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import { setContextValue } from '../../../graphql/services/contextHelper.js';
import { getAdminUserFromCookie } from '../../services/getAdminUserFromCookie.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  if (!request.getCurrentUser()) {
    const currentAdminUser = await getAdminUserFromCookie(request);
    if (currentAdminUser) {
      (request as any).locals.user = currentAdminUser;
      setContextValue(request, 'user', currentAdminUser);
    }
  }
  next();
};
