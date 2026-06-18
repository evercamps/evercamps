import { v4 as uuidv4 } from 'uuid';
import type { ItemContext, ItemField } from '../types.js';

export const identityFields: ItemField[] = [
  {
    key: 'cart_item_id',
    resolvers: [
      async function(this: ItemContext) {
        return this.getData('cart_item_id');
      }
    ]
  },
  {
    key: 'uuid',
    resolvers: [
      async function(this: ItemContext) {
        return this.getData('uuid') ?? uuidv4();
      }
    ]
  },
  {
    key: 'cart_id',
    resolvers: [
      async function(this: ItemContext) {
        return this.getCart().getData('cart_id');
      }
    ],
    dependencies: ['cart_item_id']
  }
];
