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
    }
  }
};
