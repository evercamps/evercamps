import type { Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import createParticipant from '../../services/participant/createParticipant.js';

export default async (request: EvercampsRequest, response: Response) => {
  const result = await createParticipant(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
