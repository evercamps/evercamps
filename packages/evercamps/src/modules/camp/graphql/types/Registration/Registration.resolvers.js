import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getRegistrationsBaseQuery } from '../../../services/getRegistrationsBaseQuery.js';
import { RegistrationCollection } from '../../../services/RegistrationCollection.js';

export default {
  Query: {
    registration: async (root, { id }, { pool }) => {
      const row = await getRegistrationsBaseQuery(pool)
        .where("registration_id", "=", id)
        .load(pool);
      console.log(row);
      return row ? camelCase(row) : null;
    },
    registrations: async (_, { filters = [] }, { user }) => {
          const query = getRegistrationsBaseQuery();
          const root = new RegistrationCollection(query);
          await root.init(filters, !!user);
          console.log(root);
          return root;
    }
  },
  Registration: {
      product: async (registration, { filters = [] }, { user }, { pool }) => {
        const row = await getRegistrationsBaseQuery(
          registration.registrationId,
          !user
        ).load(pool);
        return row ? camelCase(row) : null;
      }
  }
};