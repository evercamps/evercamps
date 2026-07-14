import type { Request, Response } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { rollbackBatch } from '../../services/importBatch.js';

export default async (request: Request, response: Response): Promise<void> => {
  try {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const routeId = (request as unknown as { currentRoute?: { id: string } }).currentRoute?.id;
    const batch = await rollbackBatch(id, { routeId });
    response.status(OK);
    response.json({ data: batch });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
