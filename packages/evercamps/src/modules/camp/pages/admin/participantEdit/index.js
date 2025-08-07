import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('participant');
    query.andWhere('participant.uuid', '=', request.params.id);    

    const participant = await query.load(pool);

    if (participant === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'participantId', participant.participant_id);
      setContextValue(request, 'participantUuid', participant.uuid);
      setContextValue(request, 'pageInfo', {
        title: "Edit participant"
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
