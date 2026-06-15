import { getConfig } from '../../../../../lib/util/getConfig.js';

type SettingRow = { name: string; value: string };

const findValue = (setting: SettingRow[], name: string) =>
  setting.find((s) => s.name === name)?.value ?? null;

export default {
  Setting: {
    storeName: (setting: SettingRow[]) =>
      findValue(setting, 'storeName') ?? 'An Amazing EverCamps Store',
    storeDescription: (setting: SettingRow[]) =>
      findValue(setting, 'storeDescription') ?? 'An Amazing EverCamps Store',
    storeLanguage: () => getConfig('shop.language', 'en'),
    storeCurrency: () => getConfig('shop.currency', 'USD'),
    storeTimeZone: (setting: SettingRow[]) =>
      findValue(setting, 'storeTimeZone') ?? 'America/New_York',
    storePhoneNumber: (setting: SettingRow[]) =>
      findValue(setting, 'storePhoneNumber'),
    storeEmail: (setting: SettingRow[]) => findValue(setting, 'storeEmail'),
    storeCountry: (setting: SettingRow[]) =>
      findValue(setting, 'storeCountry') ?? 'US',
    storeAddress: (setting: SettingRow[]) => findValue(setting, 'storeAddress'),
    storeCity: (setting: SettingRow[]) => findValue(setting, 'storeCity'),
    storeProvince: (setting: SettingRow[]) =>
      findValue(setting, 'storeProvince'),
    storePostalCode: (setting: SettingRow[]) =>
      findValue(setting, 'storePostalCode')
  }
};
