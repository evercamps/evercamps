import { execute, SelectQuery } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getRegistrationsBaseQuery } from './getRegistrationsBaseQuery.js';

export const getRegistrationsByParticipantBaseQuery = async (
  participantId: number
): Promise<SelectQuery> => {
  const query = getRegistrationsBaseQuery();
  query.where('registration.registration_participant_id', '=', participantId);
  return query;
};
