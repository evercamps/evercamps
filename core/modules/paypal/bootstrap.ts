import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';
import { getSetting } from '../setting/services/setting.js';
import { voidPaymentTransaction } from './services/voidPaymentTransaction.js';

export default async (): Promise<void> => {
  hookAfter(
    'changePaymentStatus',
    async (order: any, orderID: any, status: any) => {
      if (status !== 'canceled') {
        return;
      }

      if (order.payment_method !== 'paypal') {
        return;
      }

      await voidPaymentTransaction(orderID);
    }
  );

  registerPaymentMethod({
    init: async () => ({
      methodCode: 'paypal',
      methodName: await getSetting('paypalDisplayName', 'PayPal')
    }),

    validator: async () => {
      // TODO: fix any with real model
      const paypalConfig = getConfig<any>('system.paypal', {});
      let paypalStatus: any;

      if (paypalConfig.status) {
        paypalStatus = paypalConfig.status;
      } else {
        paypalStatus = await getSetting('paypalPaymentStatus', 0);
      }

      return parseInt(paypalStatus, 10) === 1;
    }
  });
};