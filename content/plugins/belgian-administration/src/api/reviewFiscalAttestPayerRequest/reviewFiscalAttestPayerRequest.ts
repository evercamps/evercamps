import { apiHandler } from '../../lib/apiHandler.js';
import { reviewPayerRequest } from '../../services/fiscalAttest/generateFiscalAttests.js';

// POST /api/fiscal-attests/payer-requests  { registrationId, approve: boolean }  (admin)
export default apiHandler(async (request) => {
  const { registrationId, approve } = request.body || {};
  await reviewPayerRequest(Number(registrationId), approve === true || approve === 'true');
});
