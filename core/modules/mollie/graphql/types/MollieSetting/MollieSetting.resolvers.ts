import { getConfig } from '../../../../../lib/util/getConfig.js';
import type { Setting } from '../../../../setting/services/setting.js';

type MollieConfig = {
  molliePaymentStatus?: string | number;
  molliePaymentMode?: string | number;
};

export default {
  Setting: {
    molliePaymentStatus: (setting: Setting[]) => {
      const mollieConfig = getConfig<MollieConfig>('system.mollie', {});
      if (mollieConfig.molliePaymentStatus) {
        return mollieConfig.molliePaymentStatus;
      }
      const molliePaymentStatus = setting.find((s) => s.name === 'molliePaymentStatus');
      return molliePaymentStatus ? parseInt(molliePaymentStatus.value, 10) : 0;
    },
    mollieDisplayName: (setting: Setting[]) => {
      const mollieDisplayName = setting.find((s) => s.name === 'mollieDisplayName');
      return mollieDisplayName ? mollieDisplayName.value : 'Mollie';
    },
    molliePaymentMode: (setting: Setting[]) => {
      const mollieConfig = getConfig<MollieConfig>('system.mollie', {});
      if (mollieConfig.molliePaymentMode) {
        return mollieConfig.molliePaymentMode;
      }
      const molliePaymentMode = setting.find((s) => s.name === 'molliePaymentMode');
      return molliePaymentMode ? parseInt(molliePaymentMode.value, 10) : 0;
    }
  }
};
