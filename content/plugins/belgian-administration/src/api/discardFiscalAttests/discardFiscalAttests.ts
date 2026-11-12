import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { discardPending } from '../../services/fiscalAttest/batches.js';

// POST /api/fiscal-attests/discard  { year }  (admin) - drop what wasn't exported yet
export default apiHandler((request) => discardPending(requireYear(request.body?.year)));
