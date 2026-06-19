import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../../../../../../lib/util/getConfig.js';
import type { CartContext, CartField } from '../types.js';

export const identityFields: CartField[] = [
  {
    key: 'cart_id',
    resolvers: [
      async function(this: CartContext) {
        return this.getData('cart_id');
      }
    ]
  },
  {
    key: 'uuid',
    resolvers: [
      function(this: CartContext) {
        const uuid = this.getData('uuid');
        const key = uuidv4();
        return uuid || key.replace(/-/g, '');
      }
    ],
    dependencies: ['cart_id']
  },
  {
    key: 'currency',
    resolvers: [
      async function() {
        return getConfig('shop.currency', 'USD');
      }
    ]
  },
  {
    key: 'user_ip',
    resolvers: [
      async function(value?: any) {
        return value;
      }
    ]
  },
  {
    key: 'sid',
    resolvers: [
      async function(value?: any) {
        return value;
      }
    ]
  },
  {
    key: 'status',
    resolvers: [
      async function() {
        return 1;
      }
    ]
  }
];
