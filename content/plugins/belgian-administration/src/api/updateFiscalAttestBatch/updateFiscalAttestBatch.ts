import { apiHandler } from '../../lib/apiHandler.js';
import { updateBatchStatus, type BatchStatus } from '../../services/fiscalAttest/batches.js';

// POST /api/fiscal-attests/batches/:uuid/status  { status, reference }  (admin)
export default apiHandler((request) =>
  updateBatchStatus(
    String(request.params.uuid),
    String(request.body?.status ?? '') as BatchStatus,
    request.body?.reference ? String(request.body.reference).trim() : null
  )
);
