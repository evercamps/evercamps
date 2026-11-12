import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { previewFiscalAttests } from '../../services/fiscalAttest/generateFiscalAttests.js';

// GET /api/fiscal-attests/preview?year=2026  (admin)
export default apiHandler((request) => previewFiscalAttests(requireYear(request.query.year)));
