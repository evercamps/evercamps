import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { commitCorrections } from '../../services/fiscalAttest/corrections.js';

// POST /api/fiscal-attests/corrections  { year }  (admin)
export default apiHandler((request) => commitCorrections(requireYear(request.body?.year)));
