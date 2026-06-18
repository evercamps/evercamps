import type { Response, NextFunction } from 'express';
import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { ParticipantData } from '../../services/participant/createParticipant.js';

export default async (request: EvercampsRequest, response: Response, _next: NextFunction) => {
  const participant = getDelegate<ParticipantData>('updateParticipant', request);
  if(!participant) {
    throw new Error('Participant data not found');
  }
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
