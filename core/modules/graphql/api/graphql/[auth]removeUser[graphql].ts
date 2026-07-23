import type { NextFunction, Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import { setContextValue } from '../../services/contextHelper.js';

export default (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  // The graphql API supposed to be public
  // We will remove user from the context, if you want to use the user in the graphql API, you need to use the admin graphql API

  delete request.locals?.user;
  setContextValue(request, 'user', undefined);

  next();
};