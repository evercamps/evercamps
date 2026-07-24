import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    customerAddressSchema: (): unknown =>
      getConfig('customer.addressSchema', undefined)
  }
};