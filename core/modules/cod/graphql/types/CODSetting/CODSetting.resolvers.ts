import type { Setting } from '../../../../setting/services/setting.js';

export default {
  Setting: {
    codPaymentStatus: (setting: Setting[]) => {
      const codPaymentStatus = setting.find((s) => s.name === 'codPaymentStatus');
      return codPaymentStatus ? parseInt(codPaymentStatus.value, 10) : 0;
    },
    codDisplayName: (setting: Setting[]) => {
      const codDisplayName = setting.find((s) => s.name === 'codDisplayName');
      return codDisplayName ? codDisplayName.value : 'Cash On Delivery';
    }
  }
};
