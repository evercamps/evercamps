import { getConfig } from '../../lib/util/getConfig';
import { hookAfter } from '../../lib/util/hookable';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos';
import { getSetting } from '../setting/services/setting';
import { cancelPaymentIntent } from './services/cancelPayment';
import { MollieConfig } from './types/mollieConfig';

type Order = {
  payment_method: string;
};

export default async () => {
  hookAfter('changePaymentStatus', async (order: Order, orderID: number, status: string) => {
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
      const mollieConfig = getConfig<MollieConfig>('system.mollie', {});
      let mollieStatus: string | number;
      if (mollieConfig.molliePaymentStatus) {
        mollieStatus = mollieConfig.molliePaymentStatus;
      } else {
        mollieStatus = await getSetting('molliePaymentStatus', 0);
      }
      return parseInt(String(mollieStatus), 10) === 1;
    }
  });
};
