import { hookable } from '../../../../lib/util/hookable.js';
import { getValue } from '../../../../lib/util/registry.js';
import {
  commit,
  update,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';

async function removeCustomer(
  participantId: string,
  context: Record<string, unknown> = {}
) {
  if (typeof context !== 'object' || context === null) {
    throw new Error('Context must be an object');
  }

  const connection = await getConnection();
  await startTransaction(connection);

  try {
    // Fetch the participant
    const existingParticipant = await select()
      .from('participant')
      .where('uuid', '=', participantId)
      .load(pool);

    if (!existingParticipant) {
      throw new Error('Participant not found');
    }

    if (!existingParticipant.customer_id) {
      throw new Error('This participant does not have a customer assigned');
    }
    
    const result = await update('participant')
      .given({ customer_id: null })
      .where('uuid', '=', participantId)
      .execute(connection);

    await commit(connection);

    return result;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

/**
 * Remove customer service: Unassign a customer from a participant.
 * @param participantId - The participant ID
 * @param context - Optional context for hooks
 * @returns Promise of DB result
 */
export default async (
  participantId: string,
  context: Record<string, unknown>
): Promise<Record<string, any>> => {
  return await hookable(removeCustomer, context)(participantId, context);
};
