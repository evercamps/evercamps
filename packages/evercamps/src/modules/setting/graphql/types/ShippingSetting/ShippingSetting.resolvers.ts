import { getConfig } from '../../../../../lib/util/getConfig.js';

type SettingRow = { name: string; value: string };

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
