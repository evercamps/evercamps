import { isSwitchedOn } from '../../../services/isStorefrontPageRequest.js';
import type { SettingRow } from '../../../types/index.js';

const findValue = (setting: SettingRow[], name: string) =>
  setting.find((s) => s.name === name)?.value ?? null;

export default {
  Setting: {
    storefrontOffline: (setting: SettingRow[]) =>
      isSwitchedOn(findValue(setting, 'storefrontOffline')) ? 1 : 0,
    storefrontOfflineTitle: (setting: SettingRow[]) =>
      findValue(setting, 'storefrontOfflineTitle') || null,
    storefrontOfflineMessage: (setting: SettingRow[]) =>
      findValue(setting, 'storefrontOfflineMessage') || null
  }
};
