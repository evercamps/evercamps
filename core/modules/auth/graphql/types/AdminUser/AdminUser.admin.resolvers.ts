import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { GraphQLFilter } from '../../../../../types/graphqlFilter.js';

export default {
  Query: {
    adminUser: async (root: unknown, { id }: { id: number }, { pool }: { pool: any }) => {
      const query = select().from('admin_user');
      query.where('admin_user_id', '=', id);
      const adminUser = await query.load(pool);
      return adminUser ? camelCase(adminUser) : null;
    },
    currentAdminUser: (root: unknown, args: unknown, { user }: { user: any }) =>
      user ? camelCase(user) : null,
    adminUsers: async (_: unknown, { filters = [] }: { filters: GraphQLFilter[] }, { pool }: { pool: any }) => {
      const query = select().from('admin_user');
      const currentFilters: GraphQLFilter[] = [];

      const userFilters = Array.isArray(filters) ? filters : [];

      userFilters.forEach((filter) => {
        if (filter.key === 'full_name') {
          query.andWhere('admin_user.full_name', 'LIKE', `%${filter.value}%`);
          currentFilters.push({ key: 'full_name', operation: 'eq', value: filter.value });
        }
        if (filter.key === 'status') {
          query.andWhere('admin_user.status', '=', filter.value);
          currentFilters.push({ key: 'status', operation: 'eq', value: filter.value });
        }
      });

      const sortBy = userFilters.find((f) => f.key === 'sortBy');
      const sortOrder = userFilters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'full_name') {
        query.orderBy('admin_user.full_name', sortOrder.value);
        currentFilters.push({ key: 'sortBy', operation: 'eq', value: sortBy.value });
      } else {
        query.orderBy('admin_user.admin_user_id', 'DESC');
      }

      if ((sortOrder as GraphQLFilter).key) {
        currentFilters.push({ key: 'sortOrder', operation: 'eq', value: sortOrder.value });
      }

      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(admin_user.admin_user_id)', 'total');
      cloneQuery.removeOrderBy();

      const page = userFilters.find((f) => f.key === 'page') || { value: 1 };
      const limit = userFilters.find((f) => f.key === 'limit' && f.value > 0) || { value: 20 };
      currentFilters.push({ key: 'page', operation: 'eq', value: page.value });
      currentFilters.push({ key: 'limit', operation: 'eq', value: limit.value });
      query.limit(
        (page.value - 1) * parseInt(limit.value, 10),
        parseInt(limit.value, 10)
      );

      return {
        items: (await query.execute(pool)).map((row: any) => camelCase(row)),
        total: (await cloneQuery.load(pool)).total,
        currentFilters
      };
    }
  },
  AdminUser: {
    twofaEnableUrl: (user: { uuid: string }) => buildUrl('enableTwoFa', { userId: user.uuid }),
    twofaExtendUrl: (user: { uuid: string }) => buildUrl('extendTwoFa', { userId: user.uuid })
  }
};
