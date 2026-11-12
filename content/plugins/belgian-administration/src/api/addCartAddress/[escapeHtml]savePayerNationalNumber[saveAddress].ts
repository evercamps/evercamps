import type { NextFunction, Request, Response } from 'express';
import { pool } from '../../core.js';
import { isTruthyFlag, isValidNationalNumber } from '../../lib/nationalNumber.js';

// Extra middleware on core checkout route addCartAddress (POST
// /api/carts/:cart_id/addresses), before core's saveAddress. The payment step
// form posts the payer's national number (PayerNationalNumber.tsx) along with
// the billing address; it is validated and saved on the cart and, for a
// logged-in customer, on the customer. Requests without the field (e.g. the
// shipping address) pass through untouched.
export default async (request: Request, response: Response, next: NextFunction) => {
  const body = (request.body || {}) as Record<string, unknown>;
  if (body.payer_national_number === undefined && body.payer_national_number_not_applicable === undefined) {
    next();
    return;
  }
  try {
    const notApplicable =
      isTruthyFlag(body.payer_national_number_not_applicable) || body.payer_national_number_not_applicable === 'true';
    const digits = notApplicable ? '' : String(body.payer_national_number ?? '').replace(/\D/g, '');
    if (digits && !isValidNationalNumber(digits)) {
      response.status(400);
      response.json({
        error: { status: 400, message: 'Your national number is not a valid Belgian national number' }
      });
      return;
    }

    const cartUuid = String(request.params.cart_id ?? '');
    const cartResult = await (pool as any).query(
      `UPDATE cart SET payer_national_number = $1, payer_national_number_not_applicable = $2
       WHERE uuid::text = $3 RETURNING customer_id`,
      [digits || null, notApplicable, cartUuid]
    );

    const req = request as any;
    const customerId = req.locals?.customer?.customer_id ?? cartResult.rows[0]?.customer_id ?? null;
    if (customerId && digits) {
      await (pool as any).query(`UPDATE customer SET national_number = $1 WHERE customer_id = $2`, [
        digits,
        customerId
      ]);
    }
    next();
  } catch (e) {
    response.status(500);
    response.json({ error: { status: 500, message: e instanceof Error ? e.message : String(e) } });
  }
};
