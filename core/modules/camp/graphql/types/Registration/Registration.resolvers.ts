import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getRegistrationsBaseQuery } from '../../../services/getRegistrationsBaseQuery.js';
import { RegistrationCollection } from '../../../services/RegistrationCollection.js';
import { select } from '@evershop/postgres-query-builder';

export default {
  Query: {
    registration: async (root: unknown, { id }: { id: number }, { pool }: { pool: any }) => {
      const row = await getRegistrationsBaseQuery()
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
      const row = await getRegistrationsBaseQuery()
        .where("registration_id", "=", registration.registrationId)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    participant: async (registration: { registrationId: number }, _: unknown, { pool }: { pool: any }) => {
      const row = await getRegistrationsBaseQuery()
        .where("registration_id", "=", registration.registrationId)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    variantTitle: async (
      registration: {
        productVariantId?: number | null;
        registrationId: number;
      },
      _: unknown,
      { pool }: { pool: any }
    ) => {
      let productVariantId = registration.productVariantId;
      
      if (!productVariantId) {
        const registrationRow = await select('product_variant_id')
          .from('registration')
          .where(
            'registration_id',
            '=',
            registration.registrationId
          )
          .load(pool);

        productVariantId =
          registrationRow?.product_variant_id ?? null;
      }

      if (!productVariantId) {
        return null;
      }

      const variant = await select('title')
        .from('product_variant')
        .where(
          'product_variant_id',
          '=',
          productVariantId
        )
        .load(pool);

      return variant?.title ?? null;
    },
    deleteApi: (registration: { uuid: string }) => buildUrl('deleteRegistration', { id: registration.uuid }),
  }
};
