import type { Request, Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { listFailedRows } from '../../services/importBatch.js';

// The 3rd (unused) `next` param is required - see importProducts.ts for why.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const rows = await listFailedRows(id);
    response.status(OK);
    response.json({
      data: rows.map((row) => ({
        externalProductId: row.external_product_id,
        errorMessage: row.error_message
      }))
    });
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
