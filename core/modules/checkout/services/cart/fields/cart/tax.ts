import { toPrice } from '../../../toPrice.js';
import type { CartContext, CartField } from '../types.js';

export const taxFields: CartField[] = [
  {
    key: 'tax_amount',
    resolvers: [
      async function(this: CartContext) {
        let taxAmount = 0;
        this.getItems().forEach((i) => {
          taxAmount += i.getData('tax_amount');
        });
        return toPrice(taxAmount);
      }
    ],
    dependencies: ['items', 'shipping_tax_amount']
  },
  {
    key: 'tax_amount_before_discount',
    resolvers: [
      async function(this: CartContext) {
        let taxAmount = 0;
        this.getItems().forEach((i) => {
          taxAmount += i.getData('tax_amount_before_discount');
        });
        return taxAmount;
      }
    ],
    dependencies: ['items']
  },
  {
    key: 'total_tax_amount',
    resolvers: [
      function(this: CartContext) {
        return toPrice(
          this.getData('tax_amount') + this.getData('shipping_tax_amount')
        );
      }
    ],
    dependencies: ['tax_amount', 'shipping_tax_amount']
  }
];
