import config from 'config';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';
import { getSetting } from '../setting/services/setting.js';
import { cancelPaymentIntent } from './services/cancelPayment.js';

export default async () => {
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
      const mollieConfig = getConfig('system.mollie', {});
      let mollieStatus;
      if (mollieConfig.molliePaymentStatus) {
        mollieStatus = mollieConfig.molliePaymentStatus;
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
