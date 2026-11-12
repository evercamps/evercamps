import { buildUrl } from '../../../core.js';
import { UUID_PLACEHOLDER } from '../../../lib/urlPlaceholder.js';
import {
  AUTHORITY_TYPES,
  getFiscalAttestSettings
} from '../../../services/fiscalAttest/settings.js';

export default {
  Query: {
    fiscalAttestSettings: async () => {
      const settings = await getFiscalAttestSettings();
      return {
        ...settings,
        authorityTypes: Object.entries(AUTHORITY_TYPES).map(([value, label]) => ({ value, label }))
      };
    },
    fiscalAttestBelcotaxApis: () => ({
      overviewApi: buildUrl('fiscalAttestOverview'),
      exportApi: buildUrl('exportFiscalAttestBatch'),
      discardApi: buildUrl('discardFiscalAttests'),
      // GET = preview, POST = create
      correctionsApi: buildUrl('previewFiscalAttestCorrections'),
      pdfApi: buildUrl('downloadFiscalAttestPdf'),
      batchXmlApi: buildUrl('downloadFiscalAttestBatch', { uuid: UUID_PLACEHOLDER }),
      batchStatusApi: buildUrl('updateFiscalAttestBatch', { uuid: UUID_PLACEHOLDER })
    })
  }
};
