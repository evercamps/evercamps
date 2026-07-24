import type { Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import cancelOrder from '../../services/cancelOrder.js';
import type { EvercampsRequest } from '../../../../types/request.js';

export default async (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  try {
    const { reason } = request.body as {
      reason?: string;
    };

    await cancelOrder(request.params.id as string, reason);

    response.status(OK);
    response.json({
      data: {}
    });
  } catch (err) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err instanceof Error ? err.message : String(err)
      }
    });
  }
};