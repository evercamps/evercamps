import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { exportBatch } from '../../services/fiscalAttest/batches.js';

// POST /api/fiscal-attests/export  { year, environment: 'test' | 'production' }  (admin)
// Returns { xml, fileName, batchUuid, ficheCount }; 'test' (BELCOTST) changes nothing.
export default apiHandler((request) =>
  exportBatch(requireYear(request.body?.year), request.body?.environment === 'production' ? 'production' : 'test')
);
