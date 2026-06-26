import type { SettingRow } from '../../../../../modules/setting/types/index.js';

export default {
  Setting: {
    participantCheckoutFields: (setting: SettingRow[]) =>
      setting.find((s) => s.name === 'participant_checkout_fields')?.value ?? null
  }
};
