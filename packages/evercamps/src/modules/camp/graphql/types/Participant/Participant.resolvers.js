import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getParticipantsBaseQuery } from '../../../services/getParticipantsBaseQuery.js';
import { getRegistrationsByParticipantBaseQuery } from '../../../services/getRegistrationsByParticipantBaseQuery.js';
import { ParticipantCollection } from '../../../services/ParticipantCollection.js';
import { RegistrationCollection } from '../../../services/RegistrationCollection.js';
import { select } from '@evershop/postgres-query-builder';

export default {
  Query: {
    participant: async (root, { id }, { pool }) => {
      const row = await getParticipantsBaseQuery(pool)
        .where("uuid", "=", id)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    participants: async (_, { filters = [] }) => {
          const query = getParticipantsBaseQuery();
          const root = new ParticipantCollection(query);
          await root.init(filters);
          return root;
    }
  },
  Participant: {
    editUrl: (participant) => buildUrl('participantEdit', { id: participant.uuid }),
    updateApi: (participant) => buildUrl('updateParticipant', { id: participant.uuid }),
    deleteApi: (participant) => buildUrl('deleteParticipant', { id: participant.uuid }),
    addCustomerUrl: (participant) => buildUrl('addCustomer', { participantId: participant.uuid }),
    removeCustomerUrl: (participant) => buildUrl('removeCustomer', { participantId: participant.uuid }),

    registrations: async (participant, { filters = [] }, { user }) => {
          const query = await getRegistrationsByParticipantBaseQuery(
            participant.participantId,
            !user
          );
          const root = new RegistrationCollection(query);
          await root.init(filters, !!user);
          return root;
    },
    customer: async ({ customerId }, _, { pool }) => {      
      const customer = await select()
        .from('customer')
        .where('customer_id', '=', customerId)
        .load(pool);
      return customer ? camelCase(customer) : null;
    }
  }
};