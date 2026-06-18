import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../../lib/postgres/connection.js';

export const billingFields = [
  {
    key: 'billing_address_id',
    resolvers: [
      async function resolver(billingAddressId) {
        return billingAddressId;
      }
    ],
    dependencies: ['cart_id']
  },
  {
    key: 'billingAddress',
    resolvers: [
      async function resolver() {
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
