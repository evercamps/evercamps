import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getParticipantsBaseQuery } from '../../../services/getParticipantsBaseQuery.js';
import { ParticipantCollection } from '../../../services/ParticipantCollection.js';

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
    deleteApi: (participant) => buildUrl('deleteParticipant', { id: participant.uuid })
  }
};