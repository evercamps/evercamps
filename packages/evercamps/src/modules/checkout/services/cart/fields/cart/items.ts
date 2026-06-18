import type { CartContext, CartField } from '../types.js';

export const itemFields: CartField[] = [
  {
    key: 'items',
    resolvers: [
      async function(this: CartContext) {
        const triggeredField = this.getTriggeredField();
        const requestedValue = this.getRequestedValue();
        if (triggeredField === 'items') {
          return [...requestedValue];
        } else {
          return this.getData('items');
        }
      }
    ],
    dependencies: ['cart_id', 'currency']
  },
  {
    key: 'total_qty',
    resolvers: [
      async function(this: CartContext) {
        let count = 0;
        this.getItems().forEach((i) => {
          count += parseInt(i.getData('qty'), 10);
        });
        return count;
      }
    ],
    dependencies: ['items']
  },
  {
    key: 'total_weight',
    resolvers: [
      async function(this: CartContext) {
        let weight = 0;
        this.getItems().forEach((i) => {
          weight += i.getData('product_weight') * i.getData('qty');
        });
        return weight;
      }
    ],
    dependencies: ['items']
  }
];
