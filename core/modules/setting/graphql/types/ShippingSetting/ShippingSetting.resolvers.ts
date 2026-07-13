import { getConfig } from '../../../../../lib/util/getConfig.js';
import type { SettingRow } from '../../../types/index.js';

export default {
  Setting: {
    allowedCountries: (setting: SettingRow[]) => {
      const allowedCountries = setting.find(
        (s) => s.name === 'allowedCountries'
      );
      if (allowedCountries && allowedCountries.value) {
        return JSON.parse(allowedCountries.value);
      } else {
        return ['US'];
      }
    },
    weightUnit: () => getConfig('shop.weightUnit', 'kg')
  }
};
