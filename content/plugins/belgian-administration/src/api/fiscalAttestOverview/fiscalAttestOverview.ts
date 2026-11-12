import { apiHandler, requireYear } from '../../lib/apiHandler.js';
import { listBatches, listFiches } from '../../services/fiscalAttest/batches.js';

// GET /api/fiscal-attests/overview?year=2026  (admin)
// The year's fiches (current, replaced, cancellations) and Belcotax batches.
export default apiHandler(async (request) => {
  const year = requireYear(request.query.year);
  const fiches = await listFiches(year);
  return {
    fiches: fiches.map((f) => ({
      uuid: f.uuid,
      sequenceNumber: f.sequenceNumber,
      status: f.status,
      changeType: f.changeType,
      batchId: f.batchId,
      childName: `${f.data.child.firstName} ${f.data.child.lastName}`,
      payerName: f.data.payer.fullName,
      periods: f.data.periods.map((p) => p.label),
      totalAmount: f.totalAmount,
      totalDays: f.totalDays,
      createdAt: f.createdAt
    })),
    pendingCount: fiches.filter((f) => f.batchId === null && f.status !== 'corrected').length,
    batches: await listBatches(year)
  };
});
