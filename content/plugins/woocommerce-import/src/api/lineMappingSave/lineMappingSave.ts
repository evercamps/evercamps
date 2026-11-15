import type { Request, Response, NextFunction } from 'express';
import { OK } from '../../core.js';
import { saveLineMapping } from '../../services/lineNameMap.js';

// POST /api/wc-import/line-mapping/save  (admin)
// { productName, productId, variantId, season?: number }
// The 3rd (unused) `next` param is required - see importProducts.ts for why.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await saveLineMapping(request.body || {});
    response.status(OK);
    response.json({ data: result });
  } catch (e) {
    response.status(400);
    response.json({ error: { status: 400, message: (e as Error).message } });
  }
};
