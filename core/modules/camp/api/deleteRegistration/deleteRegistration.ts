import type { Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import deleteRegistration from '../../services/registration/deleteRegistration.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  try {
    let { id } = request.params;
    
    if(typeof id !== 'string') {
      id = id[0];
    }
    
    const participant = await deleteRegistration(id as string, {
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
