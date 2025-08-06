import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('participant');
    query.andWhere('participant.id', '=', request.params.id);    

    const category = await query.load(pool);

    if (category === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'participantId', participant.id);
      setContextValue(request, 'pageInfo', {
        title: participant.firstName
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
