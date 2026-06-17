import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getRegistrationsBaseQuery } from '../../../services/getRegistrationsBaseQuery.js';
import { RegistrationCollection } from '../../../services/RegistrationCollection.js';

export default {
  Query: {
    registration: async (root: unknown, { id }: { id: number }, { pool }: { pool: any }) => {
      const row = await getRegistrationsBaseQuery(pool)
        .where("registration_id", "=", id)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    registrations: async (_: unknown, { filters = [] }: { filters: any[] }, { user }: { user: any }) => {
      const query = getRegistrationsBaseQuery();
      const root = new RegistrationCollection(query);
      await root.init(filters, !!user);
      console.log(root);
      return root;
    }
  },
  Registration: {
    product: async (registration: { registrationId: number }, { filters = [] }: { filters: any[] }, { user }: { user: any }, { pool }: { pool: any }) => {
      const row = await getRegistrationsBaseQuery(
        registration.registrationId,
        !user
      ).load(pool);
      return row ? camelCase(row) : null;
    },
    participant: async (registration: { registrationId: number }, _: unknown, { pool }: { pool: any }) => {
      const row = await getRegistrationsBaseQuery(pool)
        .where("registration_id", "=", registration.registrationId)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    deleteApi: (registration: { uuid: string }) => buildUrl('deleteRegistration', { id: registration.uuid }),
  }
};
