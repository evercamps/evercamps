import type { Request, Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { loadVariants, searchProducts } from '../../services/lineNameMap.js';

// GET /api/wc-import/line-mapping/products?q=kamp   -> matching products
// GET /api/wc-import/line-mapping/products?id=12    -> that product's variants
// (admin). The 3rd (unused) `next` param is required - see importProducts.ts.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(String(request.query.id ?? ''), 10);
    const data = id
      ? (await loadVariants([id]))[id] ?? []
      : await searchProducts(String(request.query.q ?? ''));
    response.status(OK);
    response.json({ data });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({ error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message } });
  }
};
