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

export type AddCustomerContext = {
  participantId: string;
  customerId: number;
  [key: string]: unknown;
};

async function addCustomer(
  participantId: string,
  customerId: number
) {  
  
  const connection = await getConnection();
  await startTransaction(connection);

  try {        
    
    const existingParticipant = await select()
      .from('participant')
      .where('uuid', '=', participantId)
      .load(pool);

    if (!existingParticipant) {
      throw new Error('Participant not found');
    }

    if (existingParticipant.customer_id) {
      throw new Error('This participant already has a customer assigned');
    }
    
    const customer = await update('participant')
      .given({ customer_id: customerId })
      .where('uuid', '=', participantId)
      .execute(connection);

    await commit(connection);

    return customer;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

/**
 * Add customer service: Assign a customer to a participant.
 * @param {string} participantId - The participant ID
 * @param {number} customerId - The customer ID
 * @returns {Promise<Record<string, any>>}
 */
export default async (
  participantId: string,
  customerId: number,
  context: Record<string, unknown>
): Promise<Record<string, any>> => {
  return await hookable(addCustomer, context)(
    participantId,
    customerId
  );
};
