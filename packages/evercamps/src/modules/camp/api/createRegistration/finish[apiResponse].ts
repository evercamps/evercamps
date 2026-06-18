import type { Response, NextFunction } from 'express';
import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { RegistrationData } from '../../services/registration/createRegistration.js';

export default async (request: EvercampsRequest, response: Response, _next: NextFunction) => {
  const registration = getDelegate<RegistrationData>('createRegistration', request);
  if (!registration) {
    throw new Error('Registration data not found');
  }
  response.status(OK);
  response.json({
    data: {
      ...registration,
      success: true
    }
  });
};
