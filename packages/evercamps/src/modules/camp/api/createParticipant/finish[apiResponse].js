import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const participant = await getDelegate('createParticipant', request);
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
        // {
        //   rel: 'view',
        //   href: buildUrl('participantView', { id: participant.id }),
        //   action: 'GET',
        //   types: ['text/xml']
        // }
      ]
    }
  });
};
