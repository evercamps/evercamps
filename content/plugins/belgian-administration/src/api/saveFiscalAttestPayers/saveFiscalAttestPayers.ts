import type { NextFunction, Request, Response } from 'express';
import { saveChildYearSplit } from '../../services/fiscalAttest/payers.js';

// POST /api/fiscal-attest-payers  (storefront, logged-in customer)
// Body: { participantUuid, year, otherParent: { fullName, nationalNumber, street,
//         postcode, city, country, sharePercent } | null }
// otherParent null removes the split (back to 100% for the customer).
export default async (request: Request, response: Response, _next: NextFunction) => {
  try {
    const req = request as any;
    const customer = req.locals?.customer ?? req.getCurrentCustomer?.();
    if (!customer?.customer_id) {
      response.status(401);
      response.json({ error: { status: 401, message: 'Please log in first' } });
      return;
    }
    const { participantUuid, year, otherParent } = request.body || {};
    await saveChildYearSplit(
      customer.customer_id,
      String(participantUuid),
      parseInt(year, 10),
      otherParent ?? null
    );
    response.status(200);
    response.json({ data: { success: true } });
  } catch (e) {
    response.status(400);
    response.json({ error: { status: 400, message: e instanceof Error ? e.message : String(e) } });
  }
};
