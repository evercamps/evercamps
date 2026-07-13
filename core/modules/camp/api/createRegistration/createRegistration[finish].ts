import type { Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import createRegistration from '../../services/registration/createRegistration.js';

export default async (request: EvercampsRequest, response: Response) => {
  const result = await createRegistration(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
