import type { Request, Response } from 'express';
import { getCustomerAttest } from '../../services/fiscalAttest/customerAttests.js';
import { renderFichesPdf } from '../../services/fiscalAttest/pdf.js';

// GET /api/my-fiscal-attests/:uuid/pdf  (storefront, logged-in customer)
// Only the customer the attest was made out to can download it.
export default async (request: Request, response: Response) => {
  const req = request as any;
  const customer = req.locals?.customer ?? req.getCurrentCustomer?.();
  if (!customer?.customer_id) {
    response.status(401).json({ error: { status: 401, message: 'Please log in first' } });
    return;
  }
  try {
    const data = await getCustomerAttest(customer.customer_id, String(request.params.uuid));
    if (!data) {
      response.status(404).json({ error: { status: 404, message: 'Attest not found' } });
      return;
    }
    const pdf = await renderFichesPdf([data]);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="fiscaal-attest-${data.incomeYear}-${data.sequenceNumber}.pdf"`
    );
    response.status(200).send(pdf);
  } catch (e) {
    response.status(500).json({ error: { status: 500, message: e instanceof Error ? e.message : String(e) } });
  }
};
