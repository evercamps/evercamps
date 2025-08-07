import config from 'config';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';
import { getSetting } from '../setting/services/setting.js';
import { cancelPaymentIntent } from './services/cancelPayment.js';

export default async () => {
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

  hookAfter('changePaymentStatus', async (order, orderID, status) => {
    if (status !== 'canceled') {
      return;
    }
    if (order.payment_method !== 'mollie') {
      return;
    }
    await cancelPaymentIntent(orderID);
  });

  registerPaymentMethod({
    init: async () => ({
      methodCode: 'mollie',
      methodName: await getSetting('mollieDisplayName', 'Mollie')
    }),
    validator: async () => {
      const stripeConfig = getConfig('system.mollie', {});
      let mollieStatus;
      if (stripeConfig.status) {
        mollieStatus = stripeConfig.status;
      } else {
        mollieStatus = await getSetting('molliePaymentStatus', 0);
      }
      if (parseInt(mollieStatus, 10) === 1) {
        return true;
      } else {
        return false;
      }
    }
  });
};
