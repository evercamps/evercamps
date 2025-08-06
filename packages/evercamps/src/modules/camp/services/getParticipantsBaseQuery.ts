import { select, SelectQuery } from '@evershop/postgres-query-builder';

export const getParticipantsBaseQuery = (): SelectQuery => {
  const query = select().from('participant');

  return query;
};
