import type { ItemContext, ItemField } from '../types.js';

export const inventoryFields: ItemField[] = [
  {
    key: 'qty',
    resolvers: [
      async function(this: ItemContext) {
        const triggeredField = this.getTriggeredField();
        const requestedValue = this.getRequestedValue();
        const qty = triggeredField === 'qty' ? requestedValue : this.getData('qty');
        const product = await this.getProduct();
        if (product.manage_stock === true && product.qty < 1) {
          this.setError('qty', 'This item is out of stock');
        } else if (product.manage_stock === true && product.qty < qty) {
          this.setError('qty', 'We do not have enough stock');
        }
        return parseInt(qty, 10) ?? null;
      }
    ]
  }
];
