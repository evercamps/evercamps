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

async function deleteRegistrationData(id: string, connection: PoolClient) {
  await del('registration').where('registration_id', '=', id).execute(connection);
}
/**
 * Delete registration service. This service will delete a registration with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteRegistration(uuid: string, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('registration');
    const category = await query.where('registration_id', '=', uuid).load(connection);

    if (!category) {
      throw new Error('Invalid registration id');
    }
    await hookable(deleteRegistrationData, { ...context, connection, category })(
      uuid,
      connection
    );

    await commit(connection);
    return category;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete registration service. This service will delete a registration with all related data
 * @param {String} uuid
 * @param {Object} context
 */
export default async (uuid: string, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const registration = await hookable(deleteRegistration, context)(uuid, context);
  return registration;
};
