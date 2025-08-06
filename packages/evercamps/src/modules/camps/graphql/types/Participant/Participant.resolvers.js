import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getParticipantsBaseQuery } from '../../../services/getParticipantsBaseQuery.js';
import { ParticipantCollection } from '../../../../../modules/camps/services/ParticipantCollection.js';

export default {
  Query: {
    participant: async (root, { id }, { pool }) => {
      const row = await getParticipantsBaseQuery(pool)
        .where("id", "=", id)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    participants: async (_, { filters = [] }, { user }) => {
          const query = getParticipantsBaseQuery();
          const root = new ParticipantCollection(query);
          await root.init(filters, !!user);
          return root;
    }
  },
  Participant: {
    editUrl: (participant) => buildUrl('participantEdit', { id: participant.id }),
    updateApi: (participant) => buildUrl('updateParticipant', { id: participant.id }),
    deleteApi: (participant) => buildUrl('deleteParticipant', { id: participant.id })
  }
};