import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getParticipantsBaseQuery } from '../../../services/getParticipantsBaseQuery.js';
import { getRegistrationsByParticipantBaseQuery } from '../../../services/getRegistrationsByParticipantBaseQuery.js';
import { ParticipantCollection } from '../../../services/ParticipantCollection.js';
import { RegistrationCollection } from '../../../services/RegistrationCollection.js';
import { select } from '@evershop/postgres-query-builder';

export default {
  Query: {
    participant: async (root: unknown, { id }: { id: string }, { pool }: { pool: any }) => {
      const row = await getParticipantsBaseQuery(pool)
        .where("uuid", "=", id)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    participants: async (_: unknown, { filters = [] }: { filters: any[] }) => {
      const query = getParticipantsBaseQuery();
      const root = new ParticipantCollection(query);
      await root.init(filters);
      return root;
    }
  },
  Participant: {
    editUrl: (participant: { uuid: string }) => buildUrl('participantEdit', { id: participant.uuid }),
    updateApi: (participant: { uuid: string }) => buildUrl('updateParticipant', { id: participant.uuid }),
    deleteApi: (participant: { uuid: string }) => buildUrl('deleteParticipant', { id: participant.uuid }),
    addCustomerUrl: (participant: { uuid: string }) => buildUrl('addCustomer', { participantId: participant.uuid }),
    removeCustomerUrl: (participant: { uuid: string }) => buildUrl('removeCustomer', { participantId: participant.uuid }),

    registrations: async (participant: { participantId: number }, { filters = [] }: { filters: any[] }, { user }: { user: any }) => {
      const query = await getRegistrationsByParticipantBaseQuery(
        participant.participantId,
        !user
      );
      const root = new RegistrationCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    customer: async ({ customerId }: { customerId: number }, _: unknown, { pool }: { pool: any }) => {
      const customer = await select()
        .from('customer')
        .where('customer_id', '=', customerId)
        .load(pool);
      return customer ? camelCase(customer) : null;
    }
  }
};
