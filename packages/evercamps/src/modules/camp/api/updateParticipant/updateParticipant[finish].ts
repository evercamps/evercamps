import type { Response } from 'express';
import { EvercampsRequest } from '../../../../types/request.js';
import updateParticipant from '../../services/participant/updateParticipant.js';

export default async (request: EvercampsRequest, response: Response) => {
   let { id } = request.params;

    if(id instanceof Array) {
      id = id[0];
    }
  const participant = await updateParticipant(id, request.body, {
    routeId: request.currentRoute.id
  });
  return participant;
};
