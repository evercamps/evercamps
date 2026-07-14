import type { Request, Response } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { runImport } from '../../lib/runImport.js';

export default async (request: Request, response: Response): Promise<void> => {
  try {
    const batch = await runImport();
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
