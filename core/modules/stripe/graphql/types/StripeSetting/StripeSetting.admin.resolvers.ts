import { getConfig } from '../../../../../lib/util/getConfig.js';

interface Setting {
  name: string;
  value: string;
}

interface GraphQLContext {
  user?: unknown;
}

export default {
  Setting: {
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

    stripeSecretKey: (
      setting: Setting[],
      _: unknown,
      { user }: GraphQLContext
    ): string | null => {
      const stripeConfig: any = getConfig('system.stripe', {});

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

        return stripeSecretKey
          ? stripeSecretKey.value
          : null;
      }

      return null;
    },

    stripeEndpointSecret: (
      setting: Setting[],
      _: unknown,
      { user }: GraphQLContext
    ): string | null => {
      const stripeConfig: any = getConfig('system.stripe', {});

      if (stripeConfig.endpointSecret) {
        return `${stripeConfig.endpointSecret.substr(
          0,
          5
        )}*******************************`;
      }

      if (user) {
        const stripeEndpointSecret = setting.find(
          (s) => s.name === 'stripeEndpointSecret'
        );

        return stripeEndpointSecret
          ? stripeEndpointSecret.value
          : null;
      }

      return null;
    }
  }
};