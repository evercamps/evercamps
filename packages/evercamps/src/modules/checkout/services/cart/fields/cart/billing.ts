import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../../lib/postgres/connection.js';
import type { CartContext, CartField } from '../types.js';

export const billingFields: CartField[] = [
  {
    key: 'billing_address_id',
    resolvers: [
      async function(value?: any) {
        return value;
      }
    ],
    dependencies: ['cart_id']
  },
  {
    key: 'billingAddress',
    resolvers: [
      async function(this: CartContext) {
        if (!this.getData('billing_address_id')) {
          return undefined;
        } else {
          return {
            ...(await select()
              .from('cart_address')
              .where('cart_address_id', '=', this.getData('billing_address_id'))
              .load(pool))
          };
        }
      }
    ],
    dependencies: ['billing_address_id']
  }
];
