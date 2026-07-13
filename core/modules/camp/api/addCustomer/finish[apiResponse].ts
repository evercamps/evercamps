import type { Response, NextFunction } from 'express';
import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';

export default async (request: EvercampsRequest, response: Response, _next: NextFunction) => {
  const customer = getDelegate<Record<string, unknown>>('addCustomer', request);
  response.status(OK);
  response.json({
    data: {
      ...(customer ?? {}),
      success: true
    }
  });
};
