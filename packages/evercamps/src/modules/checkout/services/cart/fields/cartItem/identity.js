import { v4 as uuidv4 } from 'uuid';

export const identityFields = [
  {
    key: 'cart_item_id',
    resolvers: [
      async function resolver() {
        return this.getData('cart_item_id');
      }
    ]
  },
  {
    key: 'uuid',
    resolvers: [
      async function resolver() {
        return this.getData('uuid') ?? uuidv4();
      }
    ]
  },
  {
    key: 'cart_id',
    resolvers: [
      async function resolver() {
        const cart = this.getCart();
        return cart.getData('cart_id');
      }
    ],
    dependencies: ['cart_item_id']
  }
];
