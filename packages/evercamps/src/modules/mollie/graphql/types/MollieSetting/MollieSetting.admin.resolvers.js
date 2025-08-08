import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    mollieLiveApiKey: (setting) => {
      const mollieConfig = getConfig('system.mollie', {});
      if (mollieConfig.mollieLiveApiKey) {
           return `${mollieConfig.mollieLiveApiKey.substr(
          0,
          5
        )}*******************************`;
      }
      const mollieLiveApiKey = setting.find(
        (s) => s.name === 'mollieLiveApiKey'
      );
      if (mollieLiveApiKey) {
        return mollieLiveApiKey.value;
      } else {
        return null;
      }
    },
    mollieTestApiKey: (setting) => {
      const mollieConfig = getConfig('system.mollie', {});
      if (mollieConfig.mollieTestApiKey) {
           return `${mollieConfig.mollieTestApiKey.substr(
          0,
          5
        )}*******************************`;
      }
      const mollieTestApiKey = setting.find(
        (s) => s.name === 'mollieTestApiKey'
      );
      if (mollieTestApiKey) {
        return mollieTestApiKey.value;
      } else {
        return null;
      }
    }
  }
};
