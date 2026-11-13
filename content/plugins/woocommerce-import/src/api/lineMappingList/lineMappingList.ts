import type { Request, Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { getLineMappingOverview } from '../../services/lineNameMap.js';

// GET /api/wc-import/line-mapping  (admin)
// Imported order lines without a variant, grouped by line name, plus the
// names mapped by hand. The 3rd (unused) `next` param is required - see
// importProducts.ts for why.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    response.status(OK);
    response.json({ data: await getLineMappingOverview() });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({ error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message } });
  }
};
