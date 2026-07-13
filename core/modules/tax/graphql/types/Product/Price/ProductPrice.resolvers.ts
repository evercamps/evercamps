// TODO: toPrice should be in the lib folder
import { toPrice } from '../../../../../../modules/checkout/services/toPrice.js';

export default {
  Product: {
    price: async (product: any) => {
      const price = toPrice(product.price);
      return {
        regular: price,
        special: price
      };
    }
  }
};
