import { pool } from '../../core.js';
import { apiHandler } from '../../lib/apiHandler.js';
import { isValidNationalNumber } from '../../lib/nationalNumber.js';

// POST /api/customers/national-number  (admin)
// { customerUuid, nationalNumber }  - empty clears it.
export default apiHandler(async (request) => {
  const { customerUuid, nationalNumber } = request.body || {};
  const digits = String(nationalNumber ?? '').replace(/\D/g, '');
  if (digits && !isValidNationalNumber(digits)) {
    throw new Error('This is not a valid Belgian national number');
  }
  const result = await (pool as any).query(
    `UPDATE customer SET national_number = $1 WHERE uuid::text = $2 RETURNING customer_id`,
    [digits || null, String(customerUuid ?? '')]
  );
  if (result.rowCount === 0) {
    throw new Error('Customer not found');
  }
  return { nationalNumber: digits || null };
});
