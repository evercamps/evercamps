import { getConfig } from '../../lib/util/getConfig.js';
import { getSetting } from '../setting/services/setting.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';
import { CodConfig } from './types/codConfig.js';

export default async () => {
  registerPaymentMethod({
    init: async () => ({
      methodCode: 'cod',
      methodName: await getSetting('codDisplayName', 'Cash on Delivery')
    }),
    validator: async () => {
      const codConfig = getConfig<CodConfig>('system.cod', {});
      let codStatus: string | number;
      if (codConfig.status) {
        codStatus = codConfig.status;
      } else {
        codStatus = await getSetting('codPaymentStatus', 0);
      }
      return parseInt(String(codStatus), 10) === 1;
    }
  });
};
