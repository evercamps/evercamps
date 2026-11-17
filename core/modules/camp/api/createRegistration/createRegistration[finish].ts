import type { Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import createRegistration from '../../services/registration/createRegistration.js';

export default async (request: EvercampsRequest, response: Response) => {
  // send_email (default true): send the registration confirmation to the parent
  const { send_email: sendEmail, ...data } = request.body || {};
  const result = await createRegistration(data, {
    routeId: request.currentRoute.id,
    sendEmail: sendEmail !== false && sendEmail !== 'false' && sendEmail !== 0
  });
  return result;
};
