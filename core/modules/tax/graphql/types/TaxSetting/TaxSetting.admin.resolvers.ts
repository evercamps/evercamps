import type { SettingRow } from '../../../types/index.js';

const findValue = (setting: SettingRow[], name: string) =>
  setting.find((s) => s.name === name)?.value ?? null;

export default {
  Setting: {
    defaultProductTaxClassId: (setting: SettingRow[]) =>
      findValue(setting, 'defaultProductTaxClassId'),
    defaultShippingTaxClassId: (setting: SettingRow[]) =>
      findValue(setting, 'defaultShippingTaxClassId'),
    baseCalculationAddress: (setting: SettingRow[]) =>
      findValue(setting, 'baseCalculationAddress')
  }
};
