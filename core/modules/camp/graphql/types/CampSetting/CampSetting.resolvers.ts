import type { SettingRow } from '../../../../../modules/setting/types/index.js';
import { getAvailableParticipantCheckoutFields } from '../../../services/participantCheckoutFields.js';

export default {
  Query: {
    availableParticipantCheckoutFields: () => getAvailableParticipantCheckoutFields()
  },
  Setting: {
    participantCheckoutFields: (setting: SettingRow[]) =>
      setting.find((s) => s.name === 'participant_checkout_fields')?.value ?? null
  }
};
