import { apiHandler } from '../../lib/apiHandler.js';
import { setExclusion } from '../../services/fiscalAttest/exclusions.js';

// POST /api/fiscal-attests/exclusions  (admin)
// { orderId | registrationId, excluded: boolean, reason, note }
// excluded=true: no fiscal attest for that order (or registration without order).
export default apiHandler(async (request) => {
  const { orderId, registrationId, excluded, reason, note } = request.body || {};
  await setExclusion({
    orderId: orderId ? Number(orderId) : null,
    registrationId: registrationId ? Number(registrationId) : null,
    excluded: excluded === true || excluded === 'true',
    reason,
    note
  });
});
