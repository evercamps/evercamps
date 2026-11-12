import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { previewCorrections } from '../../services/fiscalAttest/corrections.js';

// GET /api/fiscal-attests/corrections?year=2026  (admin)
export default apiHandler((request) => previewCorrections(requireYear(request.query.year)));
