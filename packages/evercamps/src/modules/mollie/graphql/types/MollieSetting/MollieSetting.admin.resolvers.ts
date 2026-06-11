import { getConfig } from '../../../../../lib/util/getConfig.js';
import type { Setting } from '../../../../setting/services/setting.js';

type MollieConfig = {
  mollieLiveApiKey?: string;
  mollieTestApiKey?: string;
};

export default {
  Setting: {
    mollieLiveApiKey: (setting: Setting[]) => {
      const mollieConfig = getConfig<MollieConfig>('system.mollie', {});
      if (mollieConfig.mollieLiveApiKey) {
        return `${mollieConfig.mollieLiveApiKey.substr(0, 5)}*******************************`;
      }
      const mollieLiveApiKey = setting.find((s) => s.name === 'mollieLiveApiKey');
      return mollieLiveApiKey ? mollieLiveApiKey.value : null;
    },
    mollieTestApiKey: (setting: Setting[]) => {
      const mollieConfig = getConfig<MollieConfig>('system.mollie', {});
      if (mollieConfig.mollieTestApiKey) {
        return `${mollieConfig.mollieTestApiKey.substr(0, 5)}*******************************`;
      }
      const mollieTestApiKey = setting.find((s) => s.name === 'mollieTestApiKey');
      return mollieTestApiKey ? mollieTestApiKey.value : null;
    }
  }
};
