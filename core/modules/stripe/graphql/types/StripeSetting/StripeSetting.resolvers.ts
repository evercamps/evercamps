import { getConfig } from '../../../../../lib/util/getConfig.js';

interface Setting {
  name: string;
  value: string;
}

export default {
  Setting: {
    stripePaymentStatus: (
      setting: Setting[]
    ): number => {
      const stripeConfig: any = getConfig('system.stripe', {});

      if (stripeConfig.status) {
        return stripeConfig.status;
      }

      const stripePaymentStatus = setting.find(
        (s) => s.name === 'stripePaymentStatus'
      );

      return stripePaymentStatus
        ? parseInt(stripePaymentStatus.value, 10)
        : 0;
    },

    stripeDisplayName: (
      setting: Setting[]
    ): string => {
      const stripeDisplayName = setting.find(
        (s) => s.name === 'stripeDisplayName'
      );

      return stripeDisplayName
        ? stripeDisplayName.value
        : 'Credit Card';
    },

    stripePublishableKey: (
      setting: Setting[]
    ): string | null => {
      const stripeConfig: any = getConfig('system.stripe', {});

      if (stripeConfig.publishableKey) {
        return stripeConfig.publishableKey;
      }

      const stripePublishableKey = setting.find(
        (s) => s.name === 'stripePublishableKey'
      );

      return stripePublishableKey
        ? stripePublishableKey.value
        : null;
    },

    stripePaymentMode: (
      setting: Setting[]
    ): string => {
      const stripePaymentMode = setting.find(
        (s) => s.name === 'stripePaymentMode'
      );

      return stripePaymentMode
        ? stripePaymentMode.value
        : 'capture';
    }
  }
};