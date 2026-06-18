import { toPrice } from '../../../toPrice.js';
import type { CartContext, CartField } from '../types.js';

export const totalsFields: CartField[] = [
  {
    key: 'sub_total',
    resolvers: [
      async function(this: CartContext) {
        let total = 0;
        this.getItems().forEach((i) => {
          total += i.getData('line_total');
        });
        return toPrice(total);
      }
    ],
    dependencies: ['items']
  },
  {
    key: 'sub_total_incl_tax',
    resolvers: [
      async function(this: CartContext) {
        let total = 0;
        this.getItems().forEach((i) => {
          total += i.getData('line_total_incl_tax');
        });
        return toPrice(total);
      }
    ],
    dependencies: ['items']
  }
];
