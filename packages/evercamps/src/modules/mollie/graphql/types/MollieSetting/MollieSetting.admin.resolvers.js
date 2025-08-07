import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    mollieLiveApiKey: (setting) => {
      const stripeConfig = getConfig('system.mollie', {});
      if (stripeConfig.publishableKey) {
        return stripeConfig.publishableKey;
      }
      const stripePublishableKey = setting.find(
        (s) => s.name === 'stripePublishableKey'
      );
      if (stripePublishableKey) {
        return stripePublishableKey.value;
      } else {
        return null;
      }
    },
    mollieTestApiKey: (setting, _, { user }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.secretKey) {
        return `${stripeConfig.secretKey.substr(
          0,
          5
        )}*******************************`;
      }
      if (user) {
        const stripeSecretKey = setting.find(
          (s) => s.name === 'stripeSecretKey'
        );
        if (stripeSecretKey) {
          return stripeSecretKey.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }
};
