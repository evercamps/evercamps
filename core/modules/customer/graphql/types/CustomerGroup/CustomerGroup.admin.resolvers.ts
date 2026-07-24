import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CustomerGroupCollection } from '../../../services/CustomerGroupCollection.js';
import { getCustomerGroupsBaseQuery } from '../../../services/getCustomerGroupsBaseQuery.js';

interface CustomerGroup {
  customerGroupId: number;
}

interface QueryContext {
  pool: any;
}

interface CustomerGroupArgs {
  id: string;
}

interface FiltersArgs {
  filters?: any[];
}

export default {
  Query: {
    customerGroup: async (
      _root: unknown,
      { id }: CustomerGroupArgs,
      { pool }: QueryContext
    ) => {
      const group = await select()
        .from('customer_group')
        .where('customer_group.customer_group_id', '=', id)
        .load(pool);

      return group ? camelCase(group) : null;
    },

    customerGroups: async (
      _root: unknown,
      { filters = [] }: FiltersArgs
    ) => {
      const query = getCustomerGroupsBaseQuery();
      const root = new CustomerGroupCollection(query);

      await root.init({}, { filters });

      return root;
    }
  },

  CustomerGroup: {
    customers: async (
      group: CustomerGroup,
      _args: unknown,
      { pool }: QueryContext
    ) => {
      const customers = await select()
        .from('customer')
        .where('customer.group_id', '=', group.customerGroupId)
        .execute(pool);

      return customers.map((customer) => camelCase(customer));
    },

    editUrl: (group: CustomerGroup): string =>
      buildUrl('customerGroupEdit', {
        id: group.customerGroupId
      })
  }
};