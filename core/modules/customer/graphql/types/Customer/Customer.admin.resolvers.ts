import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CustomerCollection } from '../../../services/CustomerCollection.js';
import { getCustomersBaseQuery } from '../../../services/getCustomersBaseQuery.js';

export default {
  Query: {
    customer: async (
      _root: unknown,
      { id }: { id: string },
      { pool }: { pool: any }
    ) => {
      const customer = await getCustomersBaseQuery()
        .where('uuid', '=', id)
        .load(pool);

      return customer ? camelCase(customer) : null;
    },

    customers: async (
      _: unknown,
      { filters = [] }: { filters: any[] }
    ) => {
      const query = getCustomersBaseQuery();

      const root = new CustomerCollection(query);

      await root.init(filters);

      return root;
    }
  },

  Customer: {
    editUrl: (customer: { uuid: string }) =>
      buildUrl('customerEdit', { id: customer.uuid }),

    updateApi: (customer: { uuid: string }) =>
      buildUrl('updateCustomer', { id: customer.uuid }),

    deleteApi: (customer: { uuid: string }) =>
      buildUrl('deleteCustomer', { id: customer.uuid })
  }
};