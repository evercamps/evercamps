import config from 'config';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';
import { getSetting } from '../setting/services/setting.js';
import { cancelPaymentIntent } from './services/cancelPayment.js';

export default async (): Promise<void> => {
  const authorizedPaymentStatus = {
    order: {
      paymentStatus: {
        authorized: {
          name: 'Authorized',
          badge: 'attention',
          progress: 'incomplete'
        },
        failed: {
          name: 'Failed',
          badge: 'critical',
          progress: 'failed'
        },
        refunded: {
          name: 'Refunded',
          badge: 'critical',
          progress: 'complete'
        },
        partial_refunded: {
          name: 'Partial Refunded',
          badge: 'critical',
          progress: 'incomplete'
        }
      },
      psoMapping: {
        'authorized:*': 'processing',
        'failed:*': 'new',
        'refunded:*': 'closed',
        'partial_refunded:*': 'processing',
        'partial_refunded:delivered': 'completed'
      }
    }
  };

  config.util.setModuleDefaults('oms', authorizedPaymentStatus);

  hookAfter(
    'changePaymentStatus',
    async (order: any, orderID: any, status: any) => {
      if (status !== 'canceled') {
        return;
      }

      if (order.payment_method !== 'stripe') {
        return;
      }

      await cancelPaymentIntent(orderID);
    }
  );

  registerPaymentMethod({
    init: async () => ({
      methodCode: 'stripe',
      methodName: await getSetting('stripeDisplayName', 'Stripe')
    }),

    validator: async () => {
      // TODO: fix any with real model
      const stripeConfig = getConfig<any>('system.stripe', {});
      let stripeStatus: any;

      if (stripeConfig.status) {
        stripeStatus = stripeConfig.status;
      } else {
        stripeStatus = await getSetting('stripePaymentStatus', 0);
      }

      return parseInt(stripeStatus, 10) === 1;
    }
  });
};