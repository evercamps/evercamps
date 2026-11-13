import type { Request, Response, NextFunction } from 'express';
import { OK } from '../../core.js';
import { createVariantForLine } from '../../services/lineVariantCreator.js';

// POST /api/wc-import/line-mapping/create-variant  (admin)
// { productId, lineName?, sku, title, price, totalSeats, bookable,
//   options: [{ attributeId, optionId } | { attributeId, newOption: { text, startDate, endDate, dayCount } }] }
// Creates the (period) option when new, the variant, and maps the line name.
// The 3rd (unused) `next` param is required - see importProducts.ts for why.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await createVariantForLine(request.body || {});
    response.status(OK);
    response.json({ data: result });
  } catch (e) {
    response.status(400);
    response.json({ error: { status: 400, message: (e as Error).message } });
  }
};
