import type { Response, NextFunction } from 'express';
import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  const registration = await getDelegate('createRegistration', request);
  response.status(OK);
  response.json({
    data: {
      ...registration,
      success: true
    }
  });
};
