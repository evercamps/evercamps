import { select, update } from '@evershop/postgres-query-builder';
import type { NextFunction, Request, Response } from 'express';
import { pool } from '../../core.js';
import { isValidNationalNumber, isTruthyFlag } from '../../lib/nationalNumber.js';

// POST /api/fiscal-data  (storefront, logged-in customer)
// Body: {
//   nationalNumber?: string,                       // the customer's own (payer)
//   participants?: { uuid, nationalNumber, notApplicable }[]   // their children
// }
// Only participants linked to the logged-in customer can be changed.

interface ParticipantInput {
  uuid: string;
  nationalNumber?: string | null;
  notApplicable?: boolean | string | number;
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function fail(response: Response, status: number, message: string) {
  response.status(status);
  response.json({ error: { status, message } });
}

export default async (request: Request, response: Response, _next: NextFunction) => {
  try {
    const req = request as any;
    const customer = req.locals?.customer ?? req.getCurrentCustomer?.();
    if (!customer?.customer_id) {
      fail(response, 401, 'Please log in first');
      return;
    }
    const body = (request.body || {}) as {
      nationalNumber?: string | null;
      participants?: ParticipantInput[];
    };

    if (body.nationalNumber !== undefined) {
      const value = digits(body.nationalNumber);
      if (value && !isValidNationalNumber(value)) {
        fail(response, 400, 'Your national number is not a valid Belgian national number');
        return;
      }
      await update('customer')
        .given({ national_number: value || null })
        .where('customer_id', '=', customer.customer_id)
        .execute(pool);
    }

    for (const input of body.participants ?? []) {
      const participant = await select('participant_id', 'first_name')
        .from('participant')
        .where('uuid', '=', input.uuid)
        .and('customer_id', '=', customer.customer_id)
        .load(pool);
      if (!participant) {
        fail(response, 403, 'Participant not found');
        return;
      }
      const notApplicable = isTruthyFlag(input.notApplicable) || input.notApplicable === 'true';
      const value = notApplicable ? '' : digits(input.nationalNumber);
      if (value && !isValidNationalNumber(value)) {
        fail(
          response,
          400,
          `National number of ${participant.first_name} is not a valid Belgian national number`
        );
        return;
      }
      await update('participant')
        .given({
          national_number: value || null,
          national_number_not_applicable: notApplicable
        })
        .where('participant_id', '=', participant.participant_id)
        .execute(pool);
    }

    response.status(200);
    response.json({ data: { success: true } });
  } catch (e) {
    fail(response, 500, e instanceof Error ? e.message : String(e));
  }
};
