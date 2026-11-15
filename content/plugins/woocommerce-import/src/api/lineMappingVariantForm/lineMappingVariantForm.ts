import type { Request, Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { getVariantForm } from '../../services/lineVariantCreator.js';

// GET /api/wc-import/line-mapping/variant-form?productId=12&lineName=...&year=2021  (admin)
// What the "New variant" popup needs: the product's attributes + options and
// prefills from the line name. The 3rd (unused) `next` param is required -
// see importProducts.ts for why.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const year = parseInt(String(request.query.year ?? ''), 10);
    const data = await getVariantForm(
      parseInt(String(request.query.productId ?? ''), 10),
      request.query.lineName ? String(request.query.lineName) : null,
      Number.isNaN(year) ? null : year
    );
    response.status(OK);
    response.json({ data });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({ error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message } });
  }
};
