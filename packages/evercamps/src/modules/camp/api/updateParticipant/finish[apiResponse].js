import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const participant = await getDelegate('updateParticipant', request);
  response.status(OK);
  response.json({
    data: {
      ...participant,
      links: [
        {
          rel: 'participantGrid',
          href: buildUrl('participantGrid'),
          action: 'GET',
          types: ['text/xml']
        },        
        {
          rel: 'edit',
          href: buildUrl('participantEdit', { id: participant.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
