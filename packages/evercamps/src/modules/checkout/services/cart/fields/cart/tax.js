import { toPrice } from '../../../toPrice.js';

export const taxFields = [
  {
    key: 'tax_amount',
    resolvers: [
      async function resolver() {
        let taxAmount = 0;
        const items = this.getItems();
        items.forEach((i) => {
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
      async function resolver() {
        let taxAmount = 0;
        const items = this.getItems();
        items.forEach((i) => {
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
      function resolver() {
        return toPrice(
          this.getData('tax_amount') + this.getData('shipping_tax_amount')
        );
      }
    ],
    dependencies: ['tax_amount', 'shipping_tax_amount']
  }
];
