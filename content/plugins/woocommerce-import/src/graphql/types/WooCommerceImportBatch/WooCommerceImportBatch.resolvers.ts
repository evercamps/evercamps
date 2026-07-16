import { buildUrl } from '../../../core.js';
import { listBatches } from '../../../services/importBatch.js';
import type { ImportBatchSummary } from '../../../types.js';

export default {
  Query: {
    wooCommerceImportBatches: async () => listBatches(20)
  },
  WooCommerceImportBatch: {
    uuid: (batch: ImportBatchSummary) => batch.uuid,
    status: (batch: ImportBatchSummary) => batch.status,
    totalFetched: (batch: ImportBatchSummary) => batch.total_fetched,
    totalCreated: (batch: ImportBatchSummary) => batch.total_created,
    totalUpdated: (batch: ImportBatchSummary) => batch.total_updated,
    totalFailed: (batch: ImportBatchSummary) => batch.total_failed,
    errorMessage: (batch: ImportBatchSummary) => batch.error_message,
    startedAt: (batch: ImportBatchSummary) => batch.started_at,
    finishedAt: (batch: ImportBatchSummary) => batch.finished_at,
    rollbackApi: (batch: ImportBatchSummary) => buildUrl('rollbackBatch', { id: batch.uuid }),
    failuresApi: (batch: ImportBatchSummary) => buildUrl('batchFailures', { id: batch.uuid })
  }
};
