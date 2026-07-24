import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Query: {
    currentCustomer: async (
      _root: unknown,
      _args: unknown,
      { customer }: { customer: any }
    ) => (customer ? camelCase(customer) : null)
  },

  Customer: {
    addresses: async (
      customer: { customerId: number; uuid: string },
      _args: unknown,
      { pool }: { pool: any }
    ) => {
      const addresses = await select()
        .from('customer_address')
        .where('customer_id', '=', customer.customerId)
        .execute(pool);

      return addresses.map((address) => ({
        ...camelCase(address),
        updateApi: buildUrl('updateCustomerAddress', {
          address_id: address.uuid,
          customer_id: customer.uuid
        }),
        deleteApi: buildUrl('deleteCustomerAddress', {
          address_id: address.uuid,
          customer_id: customer.uuid
        })
      }));
    },

    participants: async (
      customer: { customerId: number },
      _args: unknown,
      { pool }: { pool: any }
    ) => {
      const participants = await select()
        .from('participant')
        .where('customer_id', '=', customer.customerId)
        .execute(pool);

      return participants.map((participant) => camelCase(participant));
    },

    addAddressApi: (customer: { uuid: string }) =>
      buildUrl('createCustomerAddress', {
        customer_id: customer.uuid
      })
  }
};