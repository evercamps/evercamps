import { getOrderExclusion } from '../../../services/fiscalAttest/exclusions.js';

export default {
  Order: {
    fiscalAttestExclusion: (order: { orderId: number | string }) =>
      getOrderExclusion(Number(order.orderId))
  }
};
