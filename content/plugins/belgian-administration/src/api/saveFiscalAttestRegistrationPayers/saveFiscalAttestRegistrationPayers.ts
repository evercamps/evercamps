import { apiHandler } from '../../lib/apiHandler.js';
import { saveRegistrationPayers } from '../../services/fiscalAttest/generateFiscalAttests.js';

// POST /api/fiscal-attests/payers  { registrationId, payers: PayerShare[] | null }  (admin)
export default apiHandler(async (request) => {
  const { registrationId, payers } = request.body || {};
  await saveRegistrationPayers(Number(registrationId), Array.isArray(payers) && payers.length ? payers : null);
});
