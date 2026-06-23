import type { Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import removeCustomer from '../../services/participant/removeCustomer.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  try {
    let { participantId } = request.params;

    if(participantId instanceof Array) {
      participantId = participantId[0];
    }
    const participant = await removeCustomer(participantId, {
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
