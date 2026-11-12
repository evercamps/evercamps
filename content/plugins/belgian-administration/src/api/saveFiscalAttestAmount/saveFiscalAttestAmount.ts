import { apiHandler } from '../../lib/apiHandler.js';
import { saveAmountOverride } from '../../services/fiscalAttest/generateFiscalAttests.js';

// POST /api/fiscal-attests/amount  { registrationId, amount: number | null, note }  (admin)
export default apiHandler(async (request) => {
  const { registrationId, amount, note } = request.body || {};
  const value = amount === null || amount === undefined || amount === '' ? null : Number(amount);
  await saveAmountOverride(Number(registrationId), value, note ? String(note) : null);
});
