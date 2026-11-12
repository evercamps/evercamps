import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { generateFiscalAttests } from '../../services/fiscalAttest/generateFiscalAttests.js';

// POST /api/fiscal-attests/generate  { year }  (admin)
export default apiHandler((request) => generateFiscalAttests(requireYear(request.body?.year)));
