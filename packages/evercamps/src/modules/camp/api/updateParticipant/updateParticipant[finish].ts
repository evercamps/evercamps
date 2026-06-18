import type { Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import updateParticipant from '../../services/participant/updateParticipant.js';

export default async (request: EvercampsRequest, response: Response) => {
  const participant = await updateParticipant(request.params.id, request.body, {
    routeId: request.currentRoute.id
  });
  return participant;
};
