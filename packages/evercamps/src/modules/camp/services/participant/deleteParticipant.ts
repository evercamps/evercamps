import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';

async function deleteParticipantData(uuid: string, connection: PoolClient) {
  await del('participant').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete participant service. This service will delete a participant with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteParticipant(uuid: string, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('participant');
    const participant = await query.where('uuid', '=', uuid).load(connection);

    if (!participant) {
      throw new Error('Invalid participant id');
    }
    await hookable(deleteParticipantData, { ...context, connection, participant })(
      uuid,
      connection
    );

    await commit(connection);
    return participant;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete participant service. This service will delete a participant with all related data
 * @param {String} uuid
 * @param {Object} context
 */
export default async (uuid: string, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const participant = await hookable(deleteParticipant, context)(uuid, context);
  return participant;
};
