import type { Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import deleteParticipant from '../../services/participant/deleteParticipant.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  try {
    let { id } = request.params;
    
    if(id instanceof Array) {
      id = id[0];
    }
    
    const participant = await deleteParticipant(id, {
      routeId: request.currentRoute.id
    });
    response.status(OK);
    response.json({
      data: participant
    });
  } catch (e: any) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
